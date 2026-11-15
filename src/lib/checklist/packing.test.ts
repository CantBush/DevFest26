import { describe, expect, it, vi } from "vitest";
import { TaskDetailSchema, type Profile } from "@/lib/types";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { buildChecklist } from "@/lib/checklist/build";
import { packingItemsFor } from "@/lib/checklist/packing";
import { createTaskDetail } from "@/lib/gemini/task-detail";

const NOW = new Date("2026-11-14T12:00:00.000Z");

function packingTasks(profile: Profile) {
  return buildChecklist(profile, NOW).sections.find((section) => section.id === "packing");
}

function withProfile(profile: Profile, patch: (draft: Profile) => void): Profile {
  const copy = structuredClone(profile);
  patch(copy);
  return copy;
}

describe("Packing List section", () => {
  it("follows the quiz answers", () => {
    const international = packingTasks(sampleInternationalProfile);
    expect(international).toMatchObject({ title: "Packing List", sprite: "suitcase" });
    const ids = international?.tasks.map((task) => task.id) ?? [];
    expect(ids).toEqual(expect.arrayContaining(["packing.firstNight", "packing.carryOn", "packing.keepItems", "packing.pets", "packing.hobbies"]));
    expect(ids).not.toContain("packing.kids");
    expect(ids).not.toContain("packing.medical");
    expect(international?.tasks.find((task) => task.id === "packing.clothes")?.title).toBe("Clothes for March in Seoul");

    const domestic = packingTasks(sampleDomesticProfile)?.tasks.map((task) => task.id) ?? [];
    expect(domestic).not.toContain("packing.carryOn");
    expect(domestic).toContain("packing.vehicle");
  });

  it("adds kids, pets, and disability items from the household", () => {
    const family = withProfile(sampleInternationalProfile, (draft) => {
      draft.household.people = 3;
      draft.household.kids = [{ age: 1 }, { age: 8 }];
      draft.household.disabilities = ["hearing"];
    });
    const ids = packingTasks(family)?.tasks.map((task) => task.id) ?? [];
    expect(ids).toEqual(expect.arrayContaining(["packing.kids", "packing.medical"]));
    const names = (taskId: string) => packingItemsFor(taskId, family).map((item) => item.name);
    expect(names("packing.firstNight")).toContain("Toothbrushes and toiletries for all 3 people");
    expect(names("packing.kids")).toEqual(expect.arrayContaining(["Diapers, wipes, and a changing pad", "Books, games, or a tablet with headphones"]));
    expect(names("packing.medical")).toContain("Hearing aid batteries or charger");
    expect(names("packing.carryOn")).toContain("Plug adapter for South Korea");
  });

  it("adds Gemini suggestions without duplicates or links, and keeps the list when Gemini fails", async () => {
    const generateJson = vi.fn(async () => ({
      intro: "March in Seoul is cold. See https://evil.test",
      items: [{ name: "Warm winter coat" }, { name: "Phone chargers and a power strip" }],
    }));
    const detail = await createTaskDetail({ profile: sampleInternationalProfile, taskId: "packing.firstNight", now: NOW, services: { generateJson } });
    const block = TaskDetailSchema.parse(detail).blocks.find((entry) => entry.type === "packingItems");
    if (block?.type !== "packingItems") throw new Error("missing packing items");
    expect(block.items.filter((item) => item.name === "Phone chargers and a power strip")).toHaveLength(1);
    expect(block.items.find((item) => item.name === "Warm winter coat")?.suggested).toBe(true);
    expect(JSON.stringify(detail.blocks)).not.toContain("http");

    const failed = await createTaskDetail({
      profile: sampleInternationalProfile,
      taskId: "packing.pets",
      now: NOW,
      services: { generateJson: vi.fn(async () => { throw new Error("parse"); }) },
    });
    const fallback = failed.blocks.find((entry) => entry.type === "packingItems");
    expect(fallback?.type === "packingItems" && fallback.items.some((item) => item.name.includes("your cat"))).toBe(true);
  });
});
