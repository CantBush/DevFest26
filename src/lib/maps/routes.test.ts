import { describe, expect, it } from "vitest";
import { haversineKm, straightLineMinutes } from "@/lib/maps/geo";
import { mapsPlaceUrl, mapsSearchUrl } from "@/lib/maps/links";
import { minutesFromDuration, parseRouteMatrix } from "@/lib/maps/routes";

describe("maps helpers", () => {
  it("parses route durations and a JSON matrix", () => {
    expect(minutesFromDuration("902s")).toBe(15);
    expect(minutesFromDuration(undefined)).toBeNull();
    const rows = parseRouteMatrix('[{"originIndex":0,"destinationIndex":0,"duration":"120s"}]');
    expect(rows[0]?.duration).toBe("120s");
    const lines = parseRouteMatrix('{"originIndex":0,"destinationIndex":1,"duration":"60s"}\n');
    expect(lines).toHaveLength(1);
  });

  it("estimates a straight-line trip when two points differ", () => {
    const seattle = { lat: 47.6062, lng: -122.3321 };
    const bellevue = { lat: 47.6101, lng: -122.2015 };
    expect(haversineKm(seattle, seattle)).toBe(0);
    expect(straightLineMinutes(seattle, bellevue, "car")).toBeGreaterThan(1);
    expect(straightLineMinutes(seattle, bellevue, "walk")).toBeGreaterThan(straightLineMinutes(seattle, bellevue, "car"));
  });

  it("builds map links itself and ignores a non-Google uri", () => {
    expect(mapsSearchUrl("apartments near Seoul")).toBe("https://www.google.com/maps/search/?api=1&query=apartments%20near%20Seoul");
    expect(mapsPlaceUrl("Clinic", "abc", "https://evil.test/phish")).toMatch(/query_place_id=abc/);
    expect(mapsPlaceUrl("Clinic", "abc", "https://www.google.com/maps/place/Clinic")).toBe("https://www.google.com/maps/place/Clinic");
  });
});
