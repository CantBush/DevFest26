import type { Disability, PlaceRef, Profile } from "@/lib/types";

const DISABILITY_PHRASE: Record<Disability, string> = {
  mobility: "a mobility disability or wheelchair use",
  vision: "blindness or low vision",
  hearing: "deafness or being hard of hearing",
  cognitive: "a cognitive or developmental disability",
  chronicIllness: "a chronic illness",
  mentalHealth: "a mental health condition",
  other: "a disability",
};

export function countryName(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function hasDisabilities(profile: Profile): boolean {
  return profile.household.disabilities.length > 0;
}

export function realNeeds(profile: Profile): string[] {
  return profile.household.specialNeeds.filter((need) => {
    const cleaned = need.trim().toLowerCase();
    return cleaned.length > 0 && cleaned !== "none";
  });
}

export function namedStayingBehind(profile: Profile): string[] {
  return profile.household.stayingBehind.map((name) => name.trim()).filter(Boolean);
}

export function keepsACar(profile: Profile): boolean {
  return (
    profile.dailyLife.transport.includes("car") ||
    profile.keepItems.some((item) => item.trim().toLowerCase() === "car")
  );
}

// Place-finder and commute pages center on the area the user picked, then the
// address or city they named in the quiz.
export function focusPlace(profile: Profile): PlaceRef {
  return profile.chosenArea ?? profile.destination.place;
}

export function disabilitySentence(profile: Profile): string | null {
  if (!hasDisabilities(profile)) return null;
  const phrases = profile.household.disabilities.map((item) => DISABILITY_PHRASE[item]);
  const list = phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(", ")} and ${phrases.at(-1)}`;
  const notes = profile.household.disabilityNotes?.trim();
  const base = `Someone moving has ${list}. Include step-free access, extra time, and any equipment or support they use.`;
  return notes ? `${base} They noted: ${notes}.` : base;
}

export function addDays(isoDate: string, days: number): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
