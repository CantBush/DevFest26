import { describe, expect, it } from "vitest";
import type { Checklist, Task } from "@/lib/types";
import { sampleChecklist, sampleInternationalProfile } from "@/lib/fixtures";
import { hashInputs } from "@/lib/checklist/hash";
import { buildChecklist } from "@/lib/checklist/build";
import { isTaskDetailStale, regeneratePlan } from "@/lib/checklist/regenerate";
import { dependsOnFor } from "@/lib/checklist/template";

const NOW = new Date("2026-11-14T12:00:00.000Z");

function personalized(checklist: Checklist): Checklist {
  return {
    ...checklist,
    sections: checklist.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) => ({ ...task, summary: `Personalized ${task.id}` })),
    })),
  };
}

describe("regeneratePlan", () => {
  it("keeps personalized text when the task's fields did not change", () => {
    const built = buildChecklist(sampleInternationalProfile, NOW);
    const previous = personalized(built);
    const nextProfile = { ...sampleInternationalProfile, version: 2 };
    const result = regeneratePlan(sampleInternationalProfile, nextProfile, previous, NOW);
    const visa = result.checklist.sections[0]?.tasks.find((task) => task.id === "visa.permit");
    expect(visa?.summary).toBe("Personalized visa.permit");
    expect(result.staleTaskIds).not.toContain("visa.permit");
    expect(result.reuseFactPack).toBe(false);
  });

  it("reuses the fact pack only when both countries stay the same", () => {
    const previous = { ...personalized(buildChecklist(sampleInternationalProfile, NOW)), factPack: sampleChecklist.factPack };
    const same = regeneratePlan(sampleInternationalProfile, { ...sampleInternationalProfile, version: 2 }, previous, NOW);
    expect(same.reuseFactPack).toBe(true);
    expect(same.checklist.factPack?.countryCode).toBe("KR");

    const moved = structuredClone(sampleInternationalProfile);
    moved.destination.place.countryCode = "JP";
    moved.destination.place.label = "Tokyo, Japan";
    const changed = regeneratePlan(sampleInternationalProfile, moved, previous, NOW);
    expect(changed.reuseFactPack).toBe(false);
    expect(changed.checklist.factPack).toBeUndefined();
    expect(changed.staleTaskIds).toContain("visa.permit");
    expect(changed.checklist.sections[0]?.tasks.find((task) => task.id === "visa.permit")?.summary).not.toBe("Personalized visa.permit");
  });

  it("drops a task that leaves the plan and keeps an ai task when its inputs are unchanged", () => {
    const built = buildChecklist(sampleInternationalProfile, NOW);
    const extra: Task = {
      id: "ai.paperwork.residence-card",
      sectionId: "paperwork",
      title: "Register for your residence card",
      summary: "Book the appointment after you arrive.",
      priority: "high",
      detailKind: "generic",
      source: "ai",
    };
    built.sections.find((section) => section.id === "paperwork")?.tasks.push(extra);

    const bumped = regeneratePlan(sampleInternationalProfile, { ...sampleInternationalProfile, version: 2 }, built, NOW);
    expect(bumped.checklist.sections.flatMap((section) => section.tasks).some((task) => task.id === extra.id)).toBe(true);

    const withoutPet = structuredClone(sampleInternationalProfile);
    withoutPet.household.pets = [];
    const result = regeneratePlan(sampleInternationalProfile, withoutPet, built, NOW);
    const ids = result.checklist.sections.flatMap((section) => section.tasks.map((task) => task.id));
    expect(ids).not.toContain("household.pets");
    expect(result.staleTaskIds).toContain("household.pets");
    expect(ids).not.toContain(extra.id);
    expect(result.staleTaskIds).toContain(extra.id);
  });

  it("does not store checkmarks or bookmarks on the checklist", () => {
    const result = regeneratePlan(sampleInternationalProfile, sampleInternationalProfile, buildChecklist(sampleInternationalProfile, NOW), NOW);
    expect(result.checklist).not.toHaveProperty("progress");
    expect(result.checklist).not.toHaveProperty("bookmarks");
  });

  it("marks a cached detail stale when its inputs hash changes", () => {
    const detail = {
      ...sampleChecklist.sections[0],
      taskId: "housing.areaSearch",
      blocks: [],
      places: {},
      inputsHash: hashInputs(sampleInternationalProfile, dependsOnFor("housing.areaSearch")),
      generatedAt: NOW.toISOString(),
    };
    expect(isTaskDetailStale(detail, sampleInternationalProfile)).toBe(false);
    const richer = structuredClone(sampleInternationalProfile);
    richer.money.housingBudget = 900;
    expect(isTaskDetailStale(detail, richer)).toBe(true);
  });
});
