import { describe, expect, it, vi } from "vitest";
import { TaskDetailSchema, type FactPack } from "@/lib/types";
import { sampleChecklist, sampleInternationalProfile } from "@/lib/fixtures";
import { UnknownTaskError, createTaskDetail } from "@/lib/gemini/task-detail";
import type { MapPlace } from "@/lib/maps/places";

const NOW = new Date("2026-11-14T12:00:00.000Z");
const place: MapPlace = {
  placeId: "real-place",
  name: "Real Clinic",
  address: "1 Real Street",
  lat: 37.5,
  lng: 127,
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Real%20Clinic&query_place_id=real-place",
};

describe("createTaskDetail", () => {
  it("rejects an unknown task id", async () => {
    await expect(
      createTaskDetail({
        profile: sampleInternationalProfile,
        taskId: "missing.task",
        now: NOW,
        services: { generateJson: vi.fn() },
      }),
    ).rejects.toBeInstanceOf(UnknownTaskError);
  });

  it("strips links from generic prose and falls back when the model fails", async () => {
    const generateJson = vi.fn(async () => ({
      heading: "Lease",
      paragraphs: ["Read it at https://evil.test/lease"],
      steps: ["Ask for a translation."],
    }));
    const detail = await createTaskDetail({
      profile: sampleInternationalProfile,
      taskId: "housing.rent.lease",
      now: NOW,
      services: { generateJson },
    });
    expect(TaskDetailSchema.parse(detail).blocks.some((block) => JSON.stringify(block).includes("http"))).toBe(false);
    expect(detail.places).toEqual({});

    const failed = await createTaskDetail({
      profile: sampleInternationalProfile,
      taskId: "moveOut.keys",
      now: NOW,
      services: {
        generateJson: vi.fn(async () => {
          throw new Error("parse");
        }),
      },
    });
    expect(failed.blocks[0]).toMatchObject({ type: "heading", text: "Hand over keys" });
  });

  it("keeps only place ids that the search returned", async () => {
    const detail = await createTaskDetail({
      profile: sampleInternationalProfile,
      taskId: "health.clinic",
      now: NOW,
      services: {
        searchText: vi.fn(async () => [place]),
        searchNearby: vi.fn(async () => []),
        generateJson: vi.fn(async () => ({
          intro: "Go to the invented clinic and https://evil.test",
          picks: [
            { placeId: "real-place", because: "It is the real result." },
            { placeId: "invented", because: "Do not keep this." },
          ],
        })),
      },
    });
    const places = detail.blocks.find((block) => block.type === "places");
    expect(places && places.type === "places" ? places.placeIds : []).toEqual(["real-place"]);
    expect(detail.places["invented"]).toBeUndefined();
    expect(JSON.stringify(detail.blocks)).not.toMatch(/https?:/);
    expect(detail.places["real-place"]?.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\//);
  });

  it("builds a passport check from the fact pack and only links its sources", async () => {
    const factPack = sampleChecklist.factPack as FactPack;
    const detail = await createTaskDetail({
      profile: sampleInternationalProfile,
      taskId: "visa.passport",
      factPack,
      now: NOW,
      services: { generateJson: vi.fn() },
    });
    expect(detail.blocks.some((block) => block.type === "passportCheck" && block.minMonthsAfterEntry === 6)).toBe(true);
    const links = detail.blocks.find((block) => block.type === "links");
    expect(links && links.type === "links" ? links.items.map((item) => item.url) : []).toEqual(factPack.sources.map((source) => source.url));
    expect(detail.blocks.some((block) => block.type === "callout" && block.text.includes("Verify with the official source"))).toBe(true);
  });

  it("does not call Gemini or Maps for a saved demo detail", async () => {
    const previous = process.env.DEMO_FIXTURES;
    process.env.DEMO_FIXTURES = "true";
    const generateJson = vi.fn();
    const searchText = vi.fn();
    try {
      const detail = await createTaskDetail({
        profile: sampleInternationalProfile,
        taskId: "housing.areaSearch",
        now: NOW,
        services: { generateJson, searchText },
      });
      expect(detail.blocks.some((block) => block.type === "neighborhoods")).toBe(true);
      expect(generateJson).not.toHaveBeenCalled();
      expect(searchText).not.toHaveBeenCalled();
    } finally {
      if (previous == null) delete process.env.DEMO_FIXTURES;
      else process.env.DEMO_FIXTURES = previous;
    }
  });
});
