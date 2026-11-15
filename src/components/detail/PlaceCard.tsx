import { ExternalIcon, StarIcon } from "@/components/Icons";
import type { PlaceInfo } from "@/lib/types";

const ACCESSIBILITY_LABELS = {
  entrance: "Accessible entrance",
  parking: "Accessible parking",
  restroom: "Accessible restroom",
} as const;

export function PlaceCard({ place }: { place: PlaceInfo }) {
  const badges = (Object.keys(ACCESSIBILITY_LABELS) as (keyof typeof ACCESSIBILITY_LABELS)[]).filter(
    (k) => place.accessibility?.[k],
  );

  return (
    <div className="sketch-border flex flex-col gap-1 bg-paper p-3">
      <div className="flex items-start gap-2">
        <p className="flex-1 font-bold">{place.name}</p>
        {place.rating !== undefined && (
          <span className="flex items-center gap-0.5 text-sm font-semibold">
            <StarIcon size={14} filled /> {place.rating.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-sm text-muted">{place.address}</p>
      {badges.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {badges.map((b) => (
            <span key={b} className="rounded-full bg-wash px-2 py-0.5 text-xs font-semibold">
              {ACCESSIBILITY_LABELS[b]}
            </span>
          ))}
        </div>
      )}
      <a
        href={place.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 self-start text-sm font-semibold underline"
      >
        Open in Google Maps <ExternalIcon size={14} />
      </a>
    </div>
  );
}
