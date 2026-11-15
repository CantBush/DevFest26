import { ProfileSchema, type Profile } from "@/lib/types";
import { DEFAULT_MAX_COMMUTE_MIN, type QuizDraft } from "./questions";

export function draftFromProfile(profile: Profile): QuizDraft {
  const isAddress = profile.destination.mode === "address";
  return {
    scope: profile.scope,
    origin: profile.origin,
    moveDate: profile.moveDate ?? null,
    hasHousing: isAddress,
    address: isAddress ? profile.destination.place : undefined,
    area: isAddress ? undefined : profile.destination.place,
    pins: profile.pins,
    defaultMaxCommuteMin: profile.pins[0]?.maxCommuteMin ?? DEFAULT_MAX_COMMUTE_MIN,
    people: profile.household.people,
    kids: profile.household.kids,
    disabilities: profile.household.disabilities,
    disabilityNotes: profile.household.disabilityNotes,
    pets: profile.household.pets,
    keepItems: profile.keepItems,
    specialNeeds: profile.household.specialNeeds,
    stayingBehind: profile.household.stayingBehind,
    currency: profile.money.currency,
    moveBudget: profile.money.moveBudget,
    housingIntent: profile.money.housingIntent,
    housingBudget: profile.money.housingBudget,
    currentHome: profile.currentHome,
    regulatedJob: profile.money.regulatedJob ? "yes" : "no",
    transport: profile.dailyLife.transport,
    mainTransport: profile.dailyLife.mainTransport,
    culture: profile.dailyLife.culture,
    amenities: profile.dailyLife.amenities,
    recreation: profile.dailyLife.recreation,
  };
}

// Throws a ZodError when required answers are missing.
export function profileFromDraft(draft: QuizDraft, version: number, previous?: Profile): Profile {
  const destinationPlace = draft.hasHousing ? draft.address : draft.area;
  const people = draft.people ?? 1;
  const sameDestination =
    previous !== undefined && destinationPlace?.label === previous.destination.place.label;

  return ProfileSchema.parse({
    version,
    scope: draft.scope,
    origin: draft.origin,
    moveDate: draft.moveDate ?? undefined,
    currentHome: draft.currentHome,
    destination: destinationPlace && {
      mode: draft.hasHousing ? "address" : "area",
      place: destinationPlace,
    },
    chosenArea: sameDestination ? previous.chosenArea : undefined,
    pins: draft.pins ?? [],
    household: {
      people,
      kids: people > 1 ? (draft.kids ?? []) : [],
      pets: draft.pets ?? [],
      disabilities: draft.disabilities ?? [],
      disabilityNotes: draft.disabilityNotes?.trim() || undefined,
      specialNeeds: draft.specialNeeds ?? [],
      stayingBehind: draft.stayingBehind ?? [],
    },
    keepItems: draft.scope === "international" ? (draft.keepItems ?? []) : [],
    money: {
      currency: draft.currency ?? "USD",
      moveBudget: draft.moveBudget ?? 0,
      housingIntent: draft.housingIntent,
      housingBudget: draft.housingBudget ?? 0,
      regulatedJob: draft.regulatedJob === "yes",
    },
    dailyLife: {
      transport: draft.transport ?? [],
      mainTransport: draft.mainTransport,
      culture: draft.culture ?? [],
      amenities: draft.amenities ?? [],
      recreation: draft.recreation ?? [],
    },
  });
}
