import type { Profile } from "@/lib/types";
import { DISABILITY_OPTIONS, TRANSPORT_OPTIONS, type QuizSectionId } from "./questions";

const list = (items: string[], empty = "None") => (items.length ? items.join(", ") : empty);

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// One-line answers shown on the Settings page for each quiz section.
export function summarizeSection(profile: Profile, section: QuizSectionId): { label: string; value: string }[] {
  const { household, money: m, dailyLife } = profile;
  switch (section) {
    case "move":
      return [
        { label: "Move", value: profile.scope === "international" ? "International" : "Within my country" },
        { label: "From", value: profile.origin.label },
        {
          label: profile.destination.mode === "address" ? "New home" : "Looking in",
          value: profile.destination.place.label,
        },
        { label: "Move date", value: profile.moveDate ?? "Not sure yet" },
        { label: "Pins", value: list(profile.pins.map((p) => `${p.label} (${p.maxCommuteMin} min)`)) },
      ];
    case "who":
      return [
        { label: "People", value: String(household.people) },
        ...(household.kids.length ? [{ label: "Kids", value: household.kids.map((k) => `age ${k.age}`).join(", ") }] : []),
        {
          label: "Disabilities",
          value: list(household.disabilities.map((d) => DISABILITY_OPTIONS.find((o) => o.value === d)?.label ?? d)),
        },
        { label: "Pets", value: list(household.pets.map((p) => `${p.count} ${p.kind}`)) },
        ...(profile.scope === "international" ? [{ label: "Keeping", value: list(profile.keepItems) }] : []),
        { label: "Other needs", value: list(household.specialNeeds) },
        { label: "Staying behind", value: list(household.stayingBehind) },
      ];
    case "money":
      return [
        { label: "Moving budget", value: money(m.moveBudget, m.currency) },
        {
          label: m.housingIntent === "rent" ? "Rent budget" : "Buying budget",
          value: `${money(m.housingBudget, m.currency)}${m.housingIntent === "rent" ? " / month" : ""}`,
        },
        { label: "Current home", value: { rent: "Renting", own: "Owning", other: "Other" }[profile.currentHome] },
        { label: "Licensed job", value: m.regulatedJob ? "Yes" : "No" },
      ];
    case "daily":
      return [
        {
          label: "Getting around",
          value: dailyLife.transport
            .map((t) => {
              const label = TRANSPORT_OPTIONS.find((o) => o.value === t)?.label ?? t;
              return t === dailyLife.mainTransport ? `${label} (main)` : label;
            })
            .join(", "),
        },
        { label: "Culture", value: list(dailyLife.culture) },
        { label: "Amenities", value: list(dailyLife.amenities) },
        { label: "Recreation", value: list(dailyLife.recreation) },
      ];
  }
}
