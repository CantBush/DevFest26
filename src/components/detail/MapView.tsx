"use client";

import { AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { PinIcon } from "@/components/Icons";
import { hasMapsKey } from "@/components/maps/MapsProvider";

export type MapPoint = { id: string; label: string; lat: number; lng: number; kind: "home" | "pin" | "place" };

const PIN_COLORS: Record<MapPoint["kind"], string> = {
  home: "#ff6a3d",
  pin: "#111111",
  place: "#ffffff",
};

export function MapView({ points }: { points: MapPoint[] }) {
  if (points.length === 0) return null;

  if (!hasMapsKey) {
    return (
      <div className="sketch-border flex flex-col gap-2 bg-wash p-3">
        <p className="text-sm font-bold">Map</p>
        <ul className="flex flex-col gap-1 text-sm">
          {points.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <PinIcon size={16} /> {p.label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the live map.</p>
      </div>
    );
  }

  const center = {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  };

  return (
    <div className="sketch-border h-60 overflow-hidden">
      <Map
        defaultCenter={center}
        defaultZoom={points.length > 1 ? 12 : 13}
        mapId="DEMO_MAP_ID"
        gestureHandling="cooperative"
        disableDefaultUI
      >
        {points.map((p) => (
          <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.label}>
            <Pin background={PIN_COLORS[p.kind]} borderColor="#111111" glyphColor="#111111" />
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
