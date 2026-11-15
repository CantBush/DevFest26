"use client";

import { useState } from "react";
import { PinIcon, SearchIcon } from "@/components/Icons";
import { useAppState } from "@/components/state/AppState";
import type { PlacesResponse } from "@/lib/types";
import { PlaceCard } from "./PlaceCard";

// The "Location" line and "Search" field at the top of every task page.
export function LocationSearch({
  location,
  onResults,
}: {
  location: { label: string; lat: number; lng: number };
  onResults?: (places: PlacesResponse["places"]) => void;
}) {
  const { searchPlaces } = useAppState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlacesResponse["places"] | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const places = await searchPlaces(query, location);
    setResults(places);
    onResults?.(places);
    setSearching(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <PinIcon size={16} /> {location.label}
      </p>
      <form
        className="sketch-border flex items-center gap-2 bg-paper pl-3"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <SearchIcon size={18} />
        <input
          name="nearbySearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search near ${location.label.split(",")[0]}`}
          aria-label="Search nearby places"
          className="min-h-11 min-w-0 flex-1 bg-transparent"
        />
        <button type="submit" disabled={searching} className="min-h-11 px-3 text-sm font-bold disabled:opacity-40">
          {searching ? "..." : "Search"}
        </button>
      </form>
      {results && results.length === 0 && <p className="text-sm text-muted">No places found nearby.</p>}
      {results && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((p) => (
            <PlaceCard key={p.placeId} place={p} />
          ))}
        </div>
      )}
    </div>
  );
}
