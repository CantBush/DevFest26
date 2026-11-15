import { describe, expect, it } from "vitest";
import { buildChecklist } from "@/lib/checklist/build";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { mergePersonalization, type Personalization } from "@/lib/gemini/merge";

const NOW = new Date("2026-11-14T12:00:00.000Z");

describe("mergePersonalization", () => {
  it("fills known tasks, drops unknown ids, and keeps section order", () => {
    const checklist = buildChecklist(sampleInternationalProfile, NOW);
    const order = checklist.sections.map((section) => section.id);
    const merged = mergePersonalization(checklist, {
      tasks: [
        { id: "visa.permit", summary: "Confirm the work visa at https://example.test/visa", priority: "high", dueBy: "2027-01-02" },
        { id: "not-a-task", summary: "Ignore me" },
        { id: "visa.passport", summary: "   ", dueBy: "not-a-date" },
      ],
      extraTasks: [],
    });
    expect(merged.sections.map((section) => section.id)).toEqual(order);
    const permit = merged.sections[0]?.tasks.find((task) => task.id === "visa.permit");
    expect(permit?.summary).toBe("Confirm the work visa at");
    expect(permit?.dueBy).toBe("2027-01-02");
    expect(permit?.source).toBe("template");
    const passport = merged.sections[0]?.tasks.find((task) => task.id === "visa.passport");
    expect(passport?.summary).not.toBe("");
    expect(merged.sections.flatMap((section) => section.tasks).some((task) => task.id === "not-a-task")).toBe(false);
  });

  it("appends at most two ai tasks per visible section", () => {
    const checklist = buildChecklist(sampleDomesticProfile, NOW);
    const extras: Personalization["extraTasks"] = [1, 2, 3].map((n) => ({
      sectionId: "paperwork" as const,
      title: `Extra step ${n}`,
      summary: `Do extra step ${n}.`,
      priority: "normal" as const,
    }));
    extras.push({ sectionId: "visa", title: "Should not appear", summary: "Domestic moves have no visa section.", priority: "normal" });
    const merged = mergePersonalization(checklist, { tasks: [], extraTasks: extras });
    const paperwork = merged.sections.find((section) => section.id === "paperwork");
    const added = paperwork?.tasks.filter((task) => task.source === "ai") ?? [];
    expect(added).toHaveLength(2);
    expect(added.every((task) => task.id.startsWith("ai.paperwork.") && task.detailKind === "generic")).toBe(true);
    expect(merged.sections.some((section) => section.id === "visa")).toBe(false);
  });
});
