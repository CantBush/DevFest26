import { describe, expect, it } from "vitest";
import { sampleChecklist, sampleInternationalProfile } from "@/lib/fixtures";
import { checklistFromDoc, profileFromUserDoc, progressFromDoc } from "@/lib/firebase/docs";

describe("firestore document parsers", () => {
  it("accepts a valid profile and checklist and rejects drift", () => {
    expect(profileFromUserDoc({ profile: sampleInternationalProfile })?.scope).toBe("international");
    expect(profileFromUserDoc({ profile: { scope: "domestic" } })).toBeNull();
    expect(checklistFromDoc(sampleChecklist)?.sections.length).toBeGreaterThan(0);
    expect(checklistFromDoc({ sections: [] })).toBeNull();
  });

  it("reads a done flag only from a boolean", () => {
    expect(progressFromDoc({ done: true })).toBe(true);
    expect(progressFromDoc({ done: "yes" })).toBe(false);
    expect(progressFromDoc(null)).toBe(false);
  });
});
