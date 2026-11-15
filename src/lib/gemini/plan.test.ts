import { describe, expect, it, vi } from "vitest";
import { ChecklistSchema, type FactPack } from "@/lib/types";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { buildChecklist } from "@/lib/checklist/build";
import { createPlan } from "@/lib/gemini/plan";
import { factPackFromResearch } from "@/lib/gemini/fact-pack";

const NOW = new Date("2026-11-14T12:00:00.000Z");

const draft = {
  visaOptions: [{ name: "Work visa", forWho: "People with a job offer", renewal: "Before it expires" }],
  passportRule: { minMonthsValidAfterEntry: 6, notes: "Often six months. See https://example.test" },
  apostille: { hagueConvention: true, documents: ["Diploma"], notes: "Confirm the office." },
  drivingRule: { answer: "idp" as const, notes: "An international driving permit may be required." },
  petImport: "Microchip the cat.",
  medicationAndEquipment: "Bring a letter.",
};

describe("createPlan", () => {
  it("falls back to the template when personalization fails and still keeps a fact pack", async () => {
    const factPack = factPackFromResearch(sampleInternationalProfile, draft, [{ title: "Embassy", url: "https://example.test/official" }], NOW);
    const researchFactPack = vi.fn(async () => factPack);
    const personalize = vi.fn(async () => {
      throw new Error("bad json");
    });
    const checklist = await createPlan(sampleInternationalProfile, {
      now: NOW,
      dependencies: { demo: false, researchFactPack, personalize },
    });
    expect(ChecklistSchema.parse(checklist).factPack?.sources).toEqual([{ title: "Embassy", url: "https://example.test/official" }]);
    expect(checklist.factPack?.passportRule.notes).not.toMatch(/https?:/);
    expect(checklist.factPack?.medicationAndEquipment).toBeUndefined();
    expect(checklist.sections[0]?.tasks[0]?.source).toBe("template");
    expect(personalize).toHaveBeenCalledOnce();
  });

  it("does not research a fact pack for a domestic move", async () => {
    const researchFactPack = vi.fn(async () => undefined as FactPack | undefined);
    const checklist = await createPlan(sampleDomesticProfile, {
      now: NOW,
      dependencies: {
        demo: false,
        researchFactPack,
        personalize: async () => ({ tasks: [], extraTasks: [] }),
      },
    });
    expect(researchFactPack).not.toHaveBeenCalled();
    expect(checklist.factPack).toBeUndefined();
    expect(checklist.sections.some((section) => section.id === "visa")).toBe(false);
  });

  it("serves the saved international checklist in demo mode", async () => {
    const researchFactPack = vi.fn();
    const checklist = await createPlan(sampleInternationalProfile, {
      now: NOW,
      dependencies: { demo: true, researchFactPack, personalize: vi.fn() },
    });
    expect(researchFactPack).not.toHaveBeenCalled();
    expect(checklist.factPack?.countryCode).toBe("KR");
    expect(checklist.profileVersion).toBe(sampleInternationalProfile.version);
    expect(checklist.sections[0]?.tasks[0]?.summary).not.toBe(buildChecklist(sampleInternationalProfile, NOW).sections[0]?.tasks[0]?.summary);
  });
});

describe("factPackFromResearch", () => {
  it("keeps only grounding sources and drops rules the profile does not need", () => {
    const withDisability = structuredClone(sampleInternationalProfile);
    withDisability.household.disabilities = ["mobility"];
    const pack = factPackFromResearch(
      withDisability,
      { ...draft, sources: undefined } as unknown as typeof draft,
      [{ title: "Official", url: "https://example.test/a" }],
      NOW,
    );
    expect(pack.sources).toEqual([{ title: "Official", url: "https://example.test/a" }]);
    expect(pack.countryCode).toBe("KR");
    expect(pack.medicationAndEquipment).toMatch(/letter/);
    expect(pack.petImport).toMatch(/cat/);
  });
});
