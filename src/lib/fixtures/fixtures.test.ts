import { describe, expect, it } from "vitest";
import { MAX_PINS, SECTION_ORDER } from "@/lib/types";
import {
  sampleAreaSearchDetail,
  sampleChecklist,
  sampleDomesticProfile,
  sampleGenericDetail,
  sampleInternationalProfile,
} from "./index";

describe("fixtures", () => {
  it("match the shared schemas", () => {
    expect(sampleInternationalProfile.scope).toBe("international");
    expect(sampleDomesticProfile.scope).toBe("domestic");
    expect(sampleInternationalProfile.pins.length).toBeLessThanOrEqual(MAX_PINS);
  });

  it("keep checklist sections in the plan's order", () => {
    const ids = sampleChecklist.sections.map((s) => s.id);
    const expected = SECTION_ORDER.filter((id) => ids.includes(id));
    expect(ids).toEqual(expected);
  });

  it("give every task its section's id and a unique id", () => {
    const seen = new Set<string>();
    for (const section of sampleChecklist.sections) {
      for (const task of section.tasks) {
        expect(task.sectionId).toBe(section.id);
        expect(seen.has(task.id)).toBe(false);
        seen.add(task.id);
      }
    }
  });

  it("only reference places that exist in the detail's places map", () => {
    for (const detail of [sampleAreaSearchDetail, sampleGenericDetail]) {
      for (const block of detail.blocks) {
        if (block.type === "places") {
          for (const id of block.placeIds) expect(detail.places[id]).toBeDefined();
        }
        if (block.type === "neighborhoods") {
          for (const item of block.items) {
            if (item.placeId) expect(detail.places[item.placeId]).toBeDefined();
          }
        }
      }
    }
  });
});
