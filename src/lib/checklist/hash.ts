import type { Profile } from "@/lib/types";

// Cache keys for task details. Pure JS so the checklist can run in the browser
// (Settings calls regeneratePlan on the client) and on the server.

export function getPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stable(value));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stable(record[key])]),
    );
  }
  return value;
}

function fnvPair(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  return hex(h1) + hex(h2);
}

// Hash the profile fields a task lists in dependsOn. Missing values hash as null
// so "field removed" and "field never set" stay distinct from a real value.
export function hashInputs(profile: Profile, paths: readonly string[]): string {
  const picked = Object.fromEntries(
    [...paths].sort().map((path) => [path, getPath(profile, path) ?? null]),
  );
  return fnvPair(JSON.stringify(stable(picked)));
}
