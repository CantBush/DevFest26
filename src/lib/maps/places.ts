import { z } from "zod";
import type { PlaceInfo } from "@/lib/types";
import { mapsPlaceUrl } from "@/lib/maps/links";

const BASE_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.googleMapsUri";
const ACCESSIBILITY_MASK = `${BASE_MASK},places.accessibilityOptions`;

const PlacesPayloadSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.object({ text: z.string().optional() }).optional(),
        formattedAddress: z.string().optional(),
        location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
        rating: z.number().optional(),
        googleMapsUri: z.string().optional(),
        accessibilityOptions: z
          .object({
            wheelchairAccessibleEntrance: z.boolean().optional(),
            wheelchairAccessibleParking: z.boolean().optional(),
            wheelchairAccessibleRestroom: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export type MapPlace = PlaceInfo & { placeId: string };

export type PlaceSearch = {
  query?: string;
  includedTypes?: string[];
  near: { lat: number; lng: number };
  radiusM: number;
  pageSize?: number;
  accessibility?: boolean;
};

function serverKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set.");
  return key;
}

async function postPlaces(path: string, body: unknown, accessibility: boolean): Promise<MapPlace[]> {
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": serverKey(),
      "X-Goog-FieldMask": accessibility ? ACCESSIBILITY_MASK : BASE_MASK,
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as { error: unknown }).error).slice(0, 300)
        : `Places API returned HTTP ${response.status}.`;
    throw new Error(message);
  }
  const parsed = PlacesPayloadSchema.safeParse(payload);
  if (!parsed.success) return [];
  return (parsed.data.places ?? []).flatMap((place) => {
    if (!place.location) return [];
    const name = place.displayName?.text?.trim() || "Place";
    const accessibilityOptions = place.accessibilityOptions;
    return [
      {
        placeId: place.id,
        name,
        address: place.formattedAddress?.trim() || "",
        lat: place.location.latitude,
        lng: place.location.longitude,
        ...(place.rating != null ? { rating: place.rating } : {}),
        mapsUrl: mapsPlaceUrl(name, place.id, place.googleMapsUri),
        ...(accessibilityOptions
          ? {
              accessibility: {
                ...(accessibilityOptions.wheelchairAccessibleEntrance != null
                  ? { entrance: accessibilityOptions.wheelchairAccessibleEntrance }
                  : {}),
                ...(accessibilityOptions.wheelchairAccessibleParking != null
                  ? { parking: accessibilityOptions.wheelchairAccessibleParking }
                  : {}),
                ...(accessibilityOptions.wheelchairAccessibleRestroom != null
                  ? { restroom: accessibilityOptions.wheelchairAccessibleRestroom }
                  : {}),
              },
            }
          : {}),
      },
    ];
  });
}

export async function searchText(search: PlaceSearch): Promise<MapPlace[]> {
  if (!search.query?.trim()) return [];
  return postPlaces(
    "places:searchText",
    {
      textQuery: search.query,
      pageSize: search.pageSize ?? 5,
      locationBias: {
        circle: {
          center: { latitude: search.near.lat, longitude: search.near.lng },
          radius: search.radiusM,
        },
      },
    },
    search.accessibility ?? false,
  );
}

export async function searchNearby(search: PlaceSearch): Promise<MapPlace[]> {
  if (!search.includedTypes || search.includedTypes.length === 0) return [];
  return postPlaces(
    "places:searchNearby",
    {
      includedTypes: search.includedTypes,
      maxResultCount: search.pageSize ?? 5,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: search.near.lat, longitude: search.near.lng },
          radius: search.radiusM,
        },
      },
    },
    search.accessibility ?? false,
  );
}

export function dedupePlaces(places: MapPlace[]): MapPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.placeId)) return false;
    seen.add(place.placeId);
    return true;
  });
}
