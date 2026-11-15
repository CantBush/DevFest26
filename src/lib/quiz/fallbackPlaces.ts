import type { PlaceRef } from "@/lib/types";

// Used by the place input when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set, so the
// quiz still works offline and on machines without keys.
export const FALLBACK_PLACES: PlaceRef[] = [
  { label: "Seattle, WA, USA", lat: 47.6062, lng: -122.3321, countryCode: "US" },
  { label: "Chicago, IL, USA", lat: 41.8781, lng: -87.6298, countryCode: "US" },
  { label: "Austin, TX, USA", lat: 30.2672, lng: -97.7431, countryCode: "US" },
  { label: "New York, NY, USA", lat: 40.7128, lng: -74.006, countryCode: "US" },
  { label: "San Francisco, CA, USA", lat: 37.7749, lng: -122.4194, countryCode: "US" },
  { label: "Los Angeles, CA, USA", lat: 34.0522, lng: -118.2437, countryCode: "US" },
  { label: "Boston, MA, USA", lat: 42.3601, lng: -71.0589, countryCode: "US" },
  { label: "Toronto, ON, Canada", lat: 43.6532, lng: -79.3832, countryCode: "CA" },
  { label: "Vancouver, BC, Canada", lat: 49.2827, lng: -123.1207, countryCode: "CA" },
  { label: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332, countryCode: "MX" },
  { label: "London, UK", lat: 51.5072, lng: -0.1276, countryCode: "GB" },
  { label: "Berlin, Germany", lat: 52.52, lng: 13.405, countryCode: "DE" },
  { label: "Paris, France", lat: 48.8566, lng: 2.3522, countryCode: "FR" },
  { label: "Seoul, South Korea", lat: 37.5665, lng: 126.978, countryCode: "KR" },
  { label: "Tokyo, Japan", lat: 35.6762, lng: 139.6503, countryCode: "JP" },
  { label: "Hanoi, Vietnam", lat: 21.0278, lng: 105.8342, countryCode: "VN" },
  { label: "Ho Chi Minh City, Vietnam", lat: 10.8231, lng: 106.6297, countryCode: "VN" },
  { label: "Singapore", lat: 1.3521, lng: 103.8198, countryCode: "SG" },
  { label: "Sydney, Australia", lat: -33.8688, lng: 151.2093, countryCode: "AU" },
  { label: "Gangnam Station, Seoul", lat: 37.4979, lng: 127.0276, countryCode: "KR" },
  { label: "University of Texas at Austin", lat: 30.2849, lng: -97.7341, countryCode: "US" },
  { label: "University of Washington, Seattle", lat: 47.6553, lng: -122.3035, countryCode: "US" },
];

export function searchFallbackPlaces(query: string): PlaceRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FALLBACK_PLACES.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 6);
}
