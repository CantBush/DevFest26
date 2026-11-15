"use client";

import { z } from "zod";
import { getIdToken, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  ChecklistSchema,
  PlaceInfoSchema,
  TaskDetailSchema,
  type Checklist,
  type CommuteRequest,
  type CommuteResponse,
  type FactPack,
  type PlaceRef,
  type PlacesResponse,
  type Profile,
  type TaskDetail,
} from "@/lib/types";

// Browser client for the four live routes. Each call signs in, sends the
// Firebase ID token, and checks the JSON against the shared schemas. Without
// Firebase config the token is left off; only the dev server accepts that.

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const PlacesResponseSchema = z.object({
  places: z.array(PlaceInfoSchema.extend({ placeId: z.string() })),
});

const CommuteResponseSchema = z.object({
  rows: z.array(
    z.object({
      originIndex: z.number(),
      pinId: z.string(),
      minutes: z.number().nullable(),
      withinLimit: z.boolean(),
    }),
  ),
});

async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const token = isFirebaseConfigured ? await getIdToken() : null;
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : response.status === 401
          ? "The service account is missing, so the request could not be verified."
          : "Request failed.";
    throw new ApiError(response.status, `HTTP ${response.status}: ${detail}`);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiError(response.status, `HTTP ${response.status}: Unexpected response.`);
  return parsed.data;
}

export function fetchPlan(profile: Profile): Promise<Checklist> {
  return postJson("/api/plan", { profile }, ChecklistSchema);
}

export function fetchTaskDetail(profile: Profile, taskId: string, factPack?: FactPack): Promise<TaskDetail> {
  return postJson("/api/task-detail", { profile, taskId, factPack }, TaskDetailSchema);
}

export function fetchPlaces(
  query: string,
  near: { lat: number; lng: number },
  radiusM: number,
): Promise<PlacesResponse> {
  return postJson("/api/places", { query, near, radiusM }, PlacesResponseSchema);
}

export function fetchCommute(
  origins: PlaceRef[],
  pins: Array<PlaceRef & { id: string }>,
  mode: CommuteRequest["mode"],
): Promise<CommuteResponse> {
  return postJson("/api/commute", { origins, pins, mode }, CommuteResponseSchema);
}
