"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, PinIcon } from "@/components/Icons";
import { hasMapsKey } from "@/components/maps/MapsProvider";
import { searchFallbackPlaces } from "@/lib/quiz/fallbackPlaces";
import type { PlaceRef } from "@/lib/types";

export type PlaceKind = "city" | "region" | "address" | "any";

const PRIMARY_TYPES: Record<PlaceKind, string[] | undefined> = {
  city: ["(cities)"],
  region: ["(regions)"],
  address: undefined,
  any: undefined,
};

type Props = {
  value?: PlaceRef;
  onChange: (place: PlaceRef | undefined) => void;
  kind: PlaceKind;
  placeholder?: string;
};

export function PlaceInput(props: Props) {
  if (props.value) {
    return (
      <div className="sketch-border flex min-h-12 items-center gap-2 bg-accent-soft px-3">
        <PinIcon size={20} />
        <span className="flex-1 font-semibold">{props.value.label}</span>
        <button
          type="button"
          onClick={() => props.onChange(undefined)}
          aria-label="Change place"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper"
        >
          <CloseIcon size={18} />
        </button>
      </div>
    );
  }
  return hasMapsKey ? <GooglePlaceInput {...props} /> : <FallbackPlaceInput {...props} />;
}

function SuggestionList({ items, onPick }: { items: { key: string; label: string }[]; onPick: (key: string) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="sketch-border mt-2 divide-y divide-line overflow-hidden bg-paper">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onPick(item.key)}
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-wash"
          >
            <PinIcon size={18} />
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function FallbackPlaceInput({ onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const results = searchFallbackPlaces(query);

  return (
    <div>
      <input
        name="placeSearch"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Start typing a city"}
        className="sketch-border min-h-12 w-full bg-paper px-3"
        autoComplete="off"
      />
      <SuggestionList
        items={results.map((p) => ({ key: p.label, label: p.label }))}
        onPick={(label) => onChange(results.find((p) => p.label === label))}
      />
      {query.trim().length > 1 && results.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          No match in the offline list. Add a Google Maps key to search any place.
        </p>
      )}
    </div>
  );
}

function GooglePlaceInput({ onChange, kind, placeholder }: Props) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!places || query.trim().length < 2) return;
    tokenRef.current ??= new places.AutocompleteSessionToken();
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: tokenRef.current ?? undefined,
          includedPrimaryTypes: PRIMARY_TYPES[kind],
        });
        if (cancelled) return;
        setPredictions(suggestions.flatMap((s) => (s.placePrediction ? [s.placePrediction] : [])));
        setError(null);
      } catch {
        if (!cancelled) setError("Couldn't reach Google Places. Check the browser Maps key.");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [places, query, kind]);

  const pick = async (placeId: string) => {
    const prediction = predictions.find((p) => p.placeId === placeId);
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "addressComponents"] });
      const countryCode = place.addressComponents?.find((c) => c.types.includes("country"))?.shortText;
      if (!place.location || !countryCode) {
        setError("That place has no location. Try a more specific one.");
        return;
      }
      tokenRef.current = null;
      onChange({
        placeId: place.id,
        label: kind === "address" ? (place.formattedAddress ?? prediction.text.text) : prediction.text.text,
        lat: place.location.lat(),
        lng: place.location.lng(),
        countryCode,
      });
    } catch {
      setError("Couldn't load that place. Try again.");
    }
  };

  const visible = query.trim().length < 2 ? [] : predictions;

  return (
    <div>
      <input
        name="placeSearch"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Start typing"}
        className="sketch-border min-h-12 w-full bg-paper px-3"
        autoComplete="off"
      />
      <SuggestionList items={visible.map((p) => ({ key: p.placeId, label: p.text.text }))} onPick={pick} />
      {error && <p className="mt-2 text-sm text-warn">{error}</p>}
    </div>
  );
}
