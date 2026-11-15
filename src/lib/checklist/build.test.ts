import { describe, expect, it } from "vitest";
import { ChecklistSchema, type Profile } from "@/lib/types";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { buildChecklist } from "@/lib/checklist/build";
import { TASK_TEMPLATES } from "@/lib/checklist/template";

const NOW = new Date("2026-11-14T12:00:00.000Z");

function ids(profile: Profile): string[] {
  return buildChecklist(profile, NOW).sections.flatMap((section) => section.tasks.map((task) => task.id));
}

function withProfile(profile: Profile, patch: (draft: Profile) => void): Profile {
  const copy = structuredClone(profile);
  patch(copy);
  return copy;
}

describe("buildChecklist", () => {
  it("parses both fixture profiles into a checklist", () => {
    expect(() => ChecklistSchema.parse(buildChecklist(sampleDomesticProfile, NOW))).not.toThrow();
    expect(() => ChecklistSchema.parse(buildChecklist(sampleInternationalProfile, NOW))).not.toThrow();
  });

  it("hides visa and household for the domestic solo profile", () => {
    const checklist = buildChecklist(sampleDomesticProfile, NOW);
    expect(checklist.sections.map((section) => section.id)).toEqual(["moveOut", "housing", "paperwork", "health", "moveIn"]);
    expect(ids(sampleDomesticProfile)).not.toContain("visa.permit");
    expect(ids(sampleDomesticProfile)).not.toContain("household.pets");
  });

  it("pins visa first for the international profile and names the country", () => {
    const checklist = buildChecklist(sampleInternationalProfile, NOW);
    expect(checklist.sections[0]).toMatchObject({ id: "visa", pinned: true, title: "Visa and entry" });
    const passport = checklist.sections[0]?.tasks.find((task) => task.id === "visa.passport");
    expect(passport?.title).toBe("Check passport validity for South Korea");
    expect(passport?.dueBy).toBe("2026-12-01");
    expect(ids(sampleInternationalProfile)).toEqual(expect.arrayContaining(["household.pets", "household.contact", "moveOut.mover"]));
    expect(ids(sampleInternationalProfile)).not.toContain("household.school");
  });

  it("shows rent tasks or buy tasks, never both", () => {
    expect(ids(sampleDomesticProfile).filter((id) => id.startsWith("housing.rent"))).toHaveLength(4);
    expect(ids(sampleDomesticProfile).some((id) => id.startsWith("housing.buy"))).toBe(false);
    const buying = withProfile(sampleDomesticProfile, (draft) => {
      draft.money.housingIntent = "buy";
    });
    const buyingIds = ids(buying);
    expect(buyingIds.some((id) => id.startsWith("housing.rent"))).toBe(false);
    expect(buyingIds).toEqual(expect.arrayContaining(["housing.buy.preapproval", "housing.buy.inspection", "housing.buy.closing"]));
  });

  it("uses a fit check for an address and an area search for a city", () => {
    expect(ids(sampleDomesticProfile)).toContain("housing.areaSearch");
    expect(ids(sampleDomesticProfile)).not.toContain("housing.fitCheck");
    const addressed = withProfile(sampleDomesticProfile, (draft) => {
      draft.destination.mode = "address";
    });
    expect(ids(addressed)).toContain("housing.fitCheck");
    expect(ids(addressed)).not.toContain("housing.areaSearch");
  });

  it("swaps moving-out tasks when the current home is owned", () => {
    const owned = withProfile(sampleDomesticProfile, (draft) => {
      draft.currentHome = "own";
    });
    const ownedIds = ids(owned);
    expect(ownedIds).toContain("moveOut.sellOrRent");
    expect(ownedIds).not.toEqual(expect.arrayContaining(["moveOut.notice", "moveOut.walkthrough", "moveOut.deposit"]));
  });

  it("shows household and paperwork tasks that disabilities, kids, pets, and a car turn on", () => {
    const fuller = withProfile(sampleDomesticProfile, (draft) => {
      draft.household.kids = [{ age: 7 }];
      draft.household.disabilities = ["mobility"];
      draft.household.specialNeeds = ["medical"];
      draft.dailyLife.transport = ["car", "walk"];
      draft.money.regulatedJob = true;
    });
    expect(ids(fuller)).toEqual(
      expect.arrayContaining([
        "household.school",
        "household.accessibility",
        "household.needs",
        "paperwork.disability",
        "paperwork.vehicle",
        "paperwork.workLicense",
      ]),
    );
    const visa = buildChecklist(
      withProfile(sampleInternationalProfile, (draft) => {
        draft.household.disabilities = ["vision"];
      }),
      NOW,
    )
      .sections.find((section) => section.id === "visa")
      ?.tasks.find((task) => task.id === "visa.permit");
    expect(visa?.summary).toMatch(/Someone moving has blindness or low vision/);
  });

  it("does not treat a 'none' special need as a household task", () => {
    const none = withProfile(sampleDomesticProfile, (draft) => {
      draft.household.specialNeeds = ["none"];
    });
    expect(ids(none)).not.toContain("household.needs");
    expect(buildChecklist(none, NOW).sections.some((section) => section.id === "household")).toBe(false);
  });

  it("names the transport task from the main mode and drops the commute without pins", () => {
    const bike = buildChecklist(sampleDomesticProfile, NOW).sections.find((section) => section.id === "moveIn");
    expect(bike?.tasks.find((task) => task.id === "moveIn.transport")?.title).toBe("Find bike routes and parking");
    const unpinned = withProfile(sampleDomesticProfile, (draft) => {
      draft.pins = [];
    });
    expect(ids(unpinned)).not.toContain("housing.commute");
  });

  it("keeps every template id unique and prefixed by its section", () => {
    const seen = new Set<string>();
    for (const entry of TASK_TEMPLATES) {
      expect(seen.has(entry.id)).toBe(false);
      seen.add(entry.id);
      expect(entry.id.startsWith(`${entry.sectionId}.`)).toBe(true);
    }
    expect(seen.size).toBe(TASK_TEMPLATES.length);
  });
});
