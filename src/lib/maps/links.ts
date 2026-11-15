export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsPlaceUrl(name: string, placeId: string, googleMapsUri?: string): string {
  if (googleMapsUri && /^https:\/\/(www\.)?google\.[^/]+\/maps\//.test(googleMapsUri)) return googleMapsUri;
  const params = new URLSearchParams({ api: "1", query: name, query_place_id: placeId });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
