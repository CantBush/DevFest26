import type { TransportMode } from "@/lib/types";

const EARTH_KM = 6371;
const SPEED_KMH: Record<TransportMode, number> = {
  car: 40,
  transit: 25,
  bike: 15,
  walk: 5,
};

export function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Used when the Routes API has no coverage for the mode or country.
export function straightLineMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TransportMode,
): number {
  const hours = haversineKm(from, to) / SPEED_KMH[mode];
  return Math.max(1, Math.round(hours * 60));
}

export function routesTravelMode(mode: TransportMode): "DRIVE" | "TRANSIT" | "BICYCLE" | "WALK" {
  switch (mode) {
    case "car":
      return "DRIVE";
    case "transit":
      return "TRANSIT";
    case "bike":
      return "BICYCLE";
    case "walk":
      return "WALK";
  }
}
