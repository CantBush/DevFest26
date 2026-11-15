// First /api/plan call (profile.version <= 1) is the original checklist.
// Later calls are regenerations from Settings and count toward the cap.
export const REGENERATION_CAP = 8;

export function nextRegenerationCount(
  current: number,
  profileVersion: number,
): { allowed: boolean; count: number } {
  const count = Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
  if (profileVersion <= 1) return { allowed: true, count };
  if (count >= REGENERATION_CAP) return { allowed: false, count };
  return { allowed: true, count: count + 1 };
}
