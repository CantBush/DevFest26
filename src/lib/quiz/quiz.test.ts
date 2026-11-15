import { describe, expect, it } from "vitest";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { draftFromProfile, profileFromDraft } from "./draft";
import { canFinish, visibleQuestions, type QuizDraft } from "./questions";

describe("quiz draft", () => {
  it("round-trips both demo profiles", () => {
    for (const profile of [sampleInternationalProfile, sampleDomesticProfile]) {
      expect(profileFromDraft(draftFromProfile(profile), profile.version)).toEqual(profile);
    }
  });

  it("keeps chosenArea only while the destination is unchanged", () => {
    const withArea = { ...sampleInternationalProfile, chosenArea: sampleInternationalProfile.pins[0].place };
    const draft = draftFromProfile(withArea);
    expect(profileFromDraft(draft, 2, withArea).chosenArea).toEqual(withArea.chosenArea);

    const moved: QuizDraft = { ...draft, area: sampleDomesticProfile.destination.place };
    expect(profileFromDraft(moved, 2, withArea).chosenArea).toBeUndefined();
  });

  it("refuses an incomplete draft", () => {
    expect(() => profileFromDraft({ scope: "domestic" }, 1)).toThrow();
  });

  it("drops keep items and kids when they no longer apply", () => {
    const draft: QuizDraft = {
      ...draftFromProfile(sampleInternationalProfile),
      scope: "domestic",
      people: 1,
      kids: [{ age: 4 }],
    };
    const profile = profileFromDraft(draft, 2);
    expect(profile.keepItems).toEqual([]);
    expect(profile.household.kids).toEqual([]);
  });
});

describe("visible questions", () => {
  it("asks for an address or an area depending on housing", () => {
    const ids = (d: QuizDraft) => visibleQuestions(d).map((q) => q.id);
    expect(ids({ hasHousing: true })).toContain("address");
    expect(ids({ hasHousing: true })).not.toContain("area");
    expect(ids({ hasHousing: false })).toContain("area");
  });

  it("only asks what to keep for international moves", () => {
    const ids = (d: QuizDraft) => visibleQuestions(d).map((q) => q.id);
    expect(ids({ scope: "international" })).toContain("keepItems");
    expect(ids({ scope: "domestic" })).not.toContain("keepItems");
  });

  it("lets a complete draft finish", () => {
    expect(canFinish(draftFromProfile(sampleDomesticProfile))).toBe(true);
    expect(canFinish({})).toBe(false);
  });
});
