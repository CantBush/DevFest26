import { z } from "zod";
import type { CommuteResponse, Pin, TransportMode } from "@/lib/types";
import { routesTravelMode, straightLineMinutes } from "@/lib/maps/geo";

const MatrixElementSchema = z.object({
  originIndex: z.number().int().optional(),
  destinationIndex: z.number().int().optional(),
  duration: z.string().optional(),
  condition: z.string().optional(),
  status: z.object({ code: z.number().optional(), message: z.string().optional() }).optional(),
});

export type LatLng = { lat: number; lng: number };

export type CommuteOrigin = LatLng & { label: string };

export type CommuteLeg = CommuteResponse["rows"][number] & { estimated: boolean };

export function parseDurationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration);
  if (!match) return null;
  return Number(match[1]);
}

export function minutesFromDuration(duration: string | undefined): number | null {
  const seconds = parseDurationSeconds(duration);
  if (seconds == null) return null;
  return Math.max(1, Math.round(seconds / 60));
}

export function parseRouteMatrix(payload: string): z.infer<typeof MatrixElementSchema>[] {
  const trimmed = payload.trim();
  if (!trimmed) return [];
  const json: unknown = trimmed.startsWith("[")
    ? JSON.parse(trimmed)
    : trimmed
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as unknown);
  const parsed = z.array(MatrixElementSchema).safeParse(json);
  return parsed.success ? parsed.data : [];
}

function serverKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set.");
  return key;
}

export async function commuteBetween(
  origins: CommuteOrigin[],
  pins: Pin[],
  mode: TransportMode,
): Promise<CommuteLeg[]> {
  const fallback = estimatedLegs(origins, pins, mode);
  if (origins.length === 0 || pins.length === 0) return [];

  try {
    const response = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverKey(),
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition",
      },
      body: JSON.stringify({
        origins: origins.map((origin) => ({
          waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        })),
        destinations: pins.map((pin) => ({
          waypoint: { location: { latLng: { latitude: pin.place.lat, longitude: pin.place.lng } } },
        })),
        travelMode: routesTravelMode(mode),
      }),
    });
    const text = await response.text();
    if (!response.ok) return fallback;
    const elements = parseRouteMatrix(text);
    return origins.flatMap((origin, originIndex) =>
      pins.map((pin, destinationIndex) => {
        const element = elements.find(
          (item) => (item.originIndex ?? 0) === originIndex && (item.destinationIndex ?? 0) === destinationIndex,
        );
        const failed = element?.condition === "ROUTE_NOT_FOUND" || (element?.status?.code != null && element.status.code !== 0);
        const minutes = failed ? null : minutesFromDuration(element?.duration);
        if (minutes == null) {
          const estimate = straightLineMinutes(origin, pin.place, mode);
          return { originIndex, pinId: pin.id, minutes: estimate, withinLimit: estimate <= pin.maxCommuteMin, estimated: true };
        }
        return { originIndex, pinId: pin.id, minutes, withinLimit: minutes <= pin.maxCommuteMin, estimated: false };
      }),
    );
  } catch {
    return fallback;
  }
}

function estimatedLegs(origins: CommuteOrigin[], pins: Pin[], mode: TransportMode): CommuteLeg[] {
  return origins.flatMap((origin, originIndex) =>
    pins.map((pin) => {
      const minutes = straightLineMinutes(origin, pin.place, mode);
      return { originIndex, pinId: pin.id, minutes, withinLimit: minutes <= pin.maxCommuteMin, estimated: true };
    }),
  );
}

export function toCommuteResponse(legs: CommuteLeg[]): CommuteResponse {
  return {
    rows: legs.map(({ originIndex, pinId, minutes, withinLimit }) => ({ originIndex, pinId, minutes, withinLimit })),
  };
}
