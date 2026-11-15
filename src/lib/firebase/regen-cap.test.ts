import { describe, expect, it } from "vitest";
import { REGENERATION_CAP, nextRegenerationCount } from "@/lib/firebase/regen-cap";

describe("regeneration cap", () => {
  it("does not count the first plan", () => {
    expect(nextRegenerationCount(0, 1)).toEqual({ allowed: true, count: 0 });
  });

  it("counts later plans until the cap", () => {
    expect(nextRegenerationCount(0, 2)).toEqual({ allowed: true, count: 1 });
    expect(nextRegenerationCount(REGENERATION_CAP - 1, 3)).toEqual({ allowed: true, count: REGENERATION_CAP });
    expect(nextRegenerationCount(REGENERATION_CAP, 4)).toEqual({ allowed: false, count: REGENERATION_CAP });
  });
});
