"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

export const MAPS_BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const hasMapsKey = MAPS_BROWSER_KEY.length > 0;

// Without a key the app still runs: place inputs fall back to a built-in city
// list and maps render as a simple placeholder card.
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!hasMapsKey) return <>{children}</>;
  return <APIProvider apiKey={MAPS_BROWSER_KEY}>{children}</APIProvider>;
}
