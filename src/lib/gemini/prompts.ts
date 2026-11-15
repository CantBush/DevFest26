export const SYSTEM_GUARDRAILS = [
  "You write moving-checklist content for Movingly.",
  "Never invent businesses, street addresses, listings, phone numbers, or links. Do not output URLs.",
  "Only refer to places that appear in the Places results you are given, and only by placeId. The app fills in names, addresses, and map links.",
  "Label estimates clearly with the words 'about' or 'AI estimate', especially rent ranges.",
  "Country rules must come from the fact pack you are given. When a rule is missing or unsure, say so. Do not guess a law.",
  "Name insurers, movers, and eSIM providers only as examples ('such as...'), never as the choice the person should make.",
  "When the profile lists disabilities, account for them in the task. Use respectful, person-first language.",
  "Use short, plain language. Give concrete next steps. Do not present this as legal, medical, tax, or immigration advice.",
].join(" ");

export function profileBrief(profile: {
  scope: string;
  origin: { label: string; countryCode: string };
  destination: { mode: string; place: { label: string; countryCode: string } };
  moveDate?: string;
  household: {
    people: number;
    kids: { age: number }[];
    pets: { kind: string; count: number }[];
    disabilities: string[];
    disabilityNotes?: string;
    specialNeeds: string[];
    stayingBehind: string[];
  };
  money: { currency: string; moveBudget: number; housingIntent: string; housingBudget: number; regulatedJob: boolean };
  dailyLife: { mainTransport: string; transport: string[]; culture: string[]; amenities: string[]; recreation: string[] };
  pins: { label: string; kind: string; maxCommuteMin: number }[];
  keepItems: string[];
}): string {
  return JSON.stringify(profile);
}
