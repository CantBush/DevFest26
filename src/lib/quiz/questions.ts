import type { Disability, Pin, PlaceRef, TransportMode } from "@/lib/types";

// Declarative onboarding quiz (PLAN.md section 6). Settings reuses the same
// questions and components in edit mode, so everything here is profile-agnostic.

export type QuizSectionId = "move" | "who" | "money" | "daily";

export const QUIZ_SECTIONS: { id: QuizSectionId; title: string; blurb: string }[] = [
  { id: "move", title: "The move", blurb: "Where you're going and what you need to stay near." },
  { id: "who", title: "Who, what, and housing", blurb: "Who's coming and what needs extra care." },
  { id: "money", title: "Money and work", blurb: "Budget, housing plans, and your job." },
  { id: "daily", title: "Daily life", blurb: "Getting around and feeling at home." },
];

// Answers in progress. Every field is optional until the quiz is finished;
// `profileFromDraft` (./draft.ts) turns a complete draft into a Profile.
export type QuizDraft = {
  scope?: "domestic" | "international";
  origin?: PlaceRef;
  moveDate?: string | null; // null means "not sure yet"
  hasHousing?: boolean;
  address?: PlaceRef;
  area?: PlaceRef;
  pins?: Pin[];
  defaultMaxCommuteMin?: number;
  people?: number;
  kids?: { age: number }[];
  disabilities?: Disability[];
  disabilityNotes?: string;
  pets?: { kind: string; count: number }[];
  keepItems?: string[];
  specialNeeds?: string[];
  stayingBehind?: string[];
  currency?: string;
  moveBudget?: number;
  housingIntent?: "rent" | "buy";
  housingBudget?: number;
  currentHome?: "rent" | "own" | "other";
  regulatedJob?: "yes" | "no" | "noJob";
  transport?: TransportMode[];
  mainTransport?: TransportMode;
  culture?: string[];
  amenities?: string[];
  recreation?: string[];
};

export type QuestionId =
  | "scope"
  | "origin"
  | "moveDate"
  | "hasHousing"
  | "address"
  | "area"
  | "pins"
  | "pinDistance"
  | "people"
  | "kids"
  | "disabilities"
  | "pets"
  | "keepItems"
  | "specialNeeds"
  | "stayingBehind"
  | "moveBudget"
  | "housingIntent"
  | "housingBudget"
  | "currentHome"
  | "regulatedJob"
  | "transport"
  | "culture"
  | "amenities"
  | "recreation";

export type Question = {
  id: QuestionId;
  section: QuizSectionId;
  title: string | ((draft: QuizDraft) => string);
  help?: string;
  optional?: boolean;
  showIf?: (draft: QuizDraft) => boolean;
  isAnswered: (draft: QuizDraft) => boolean;
};

export const DEFAULT_MAX_COMMUTE_MIN = 30;

const hasItems = (list?: unknown[]) => (list?.length ?? 0) > 0;

export const QUESTIONS: Question[] = [
  // The move
  {
    id: "scope",
    section: "move",
    title: "Are you moving within your country or internationally?",
    isAnswered: (d) => d.scope !== undefined,
  },
  {
    id: "origin",
    section: "move",
    title: "Where are you moving from?",
    isAnswered: (d) => d.origin !== undefined,
  },
  {
    id: "moveDate",
    section: "move",
    title: "When do you plan to move?",
    help: "A rough date is fine. We use it to set deadlines.",
    isAnswered: (d) => d.moveDate !== undefined,
  },
  {
    id: "hasHousing",
    section: "move",
    title: "Do you already have housing set?",
    isAnswered: (d) => d.hasHousing !== undefined,
  },
  {
    id: "address",
    section: "move",
    title: "What's the address?",
    showIf: (d) => d.hasHousing === true,
    isAnswered: (d) => d.address !== undefined,
  },
  {
    id: "area",
    section: "move",
    title: "Where are you thinking of moving?",
    help: "A city, state, or country is enough.",
    showIf: (d) => d.hasHousing === false,
    isAnswered: (d) => d.area !== undefined,
  },
  {
    id: "pins",
    section: "move",
    title: "Any places you need to stay near?",
    help: "A job, a campus, a person. Up to 5.",
    optional: true,
    isAnswered: (d) => hasItems(d.pins),
  },
  {
    id: "pinDistance",
    section: "move",
    title: "How far are you willing to be from them?",
    help: "Door-to-door travel time, using how you plan to get around.",
    showIf: (d) => hasItems(d.pins),
    isAnswered: () => true,
  },

  // Who, what, and housing
  {
    id: "people",
    section: "who",
    title: "How many people are moving, including you?",
    isAnswered: () => true, // the stepper starts at 1
  },
  {
    id: "kids",
    section: "who",
    title: "Any kids moving with you?",
    help: "Add their ages so we can plan school and childcare.",
    optional: true,
    showIf: (d) => (d.people ?? 1) > 1,
    isAnswered: (d) => hasItems(d.kids),
  },
  {
    id: "disabilities",
    section: "who",
    title: "Does anyone moving have a disability?",
    help: "We'll factor accessibility into housing, health, transport, and paperwork.",
    optional: true,
    isAnswered: (d) => hasItems(d.disabilities),
  },
  {
    id: "pets",
    section: "who",
    title: "Any pets coming along?",
    optional: true,
    isAnswered: (d) => hasItems(d.pets),
  },
  {
    id: "keepItems",
    section: "who",
    title: "What do you want to keep?",
    help: "Everything else can be sold, stored, or donated.",
    optional: true,
    showIf: (d) => d.scope === "international",
    isAnswered: (d) => hasItems(d.keepItems),
  },
  {
    id: "specialNeeds",
    section: "who",
    title: "Any other special considerations?",
    optional: true,
    isAnswered: (d) => hasItems(d.specialNeeds),
  },
  {
    id: "stayingBehind",
    section: "who",
    title: "Anyone staying behind you want to keep in touch with?",
    help: "We'll help you set a contact rhythm.",
    optional: true,
    isAnswered: (d) => hasItems(d.stayingBehind),
  },

  // Money and work
  {
    id: "moveBudget",
    section: "money",
    title: "What's your overall moving budget?",
    help: "Movers, travel, deposits, and setup costs.",
    isAnswered: (d) => d.moveBudget !== undefined && d.currency !== undefined,
  },
  {
    id: "housingIntent",
    section: "money",
    title: "Do you plan to rent or buy?",
    isAnswered: (d) => d.housingIntent !== undefined,
  },
  {
    id: "housingBudget",
    section: "money",
    title: (d) =>
      d.housingIntent === "buy" ? "What's your total budget to buy?" : "What's your monthly rent budget?",
    showIf: (d) => d.housingIntent !== undefined,
    isAnswered: (d) => d.housingBudget !== undefined,
  },
  {
    id: "currentHome",
    section: "money",
    title: "Do you rent or own your current home?",
    isAnswered: (d) => d.currentHome !== undefined,
  },
  {
    id: "regulatedJob",
    section: "money",
    title: "Is your job in a licensed field?",
    help: "For example nursing, teaching, law, or a trade. Licenses often need transferring.",
    isAnswered: (d) => d.regulatedJob !== undefined,
  },

  // Daily life
  {
    id: "transport",
    section: "daily",
    title: "How will you get around?",
    help: "Pick all that apply, then mark your main one.",
    isAnswered: (d) => hasItems(d.transport) && d.mainTransport !== undefined,
  },
  {
    id: "culture",
    section: "daily",
    title: "What helps you feel at home?",
    help: "Favorite foods, community groups, places of worship, or anything that reminds you of home.",
    optional: true,
    isAnswered: (d) => hasItems(d.culture),
  },
  {
    id: "amenities",
    section: "daily",
    title: "What hobbies and interests do you have?",
    help: "Things you like to do or be around, like games, books, crafts, or fan meetups.",
    optional: true,
    isAnswered: (d) => hasItems(d.amenities),
  },
  {
    id: "recreation",
    section: "daily",
    title: "How do you like to stay active?",
    help: "Sports, classes, or outdoor activities you want nearby.",
    optional: true,
    isAnswered: (d) => hasItems(d.recreation),
  },
];

export function visibleQuestions(draft: QuizDraft, section?: QuizSectionId): Question[] {
  return QUESTIONS.filter(
    (q) => (!section || q.section === section) && (!q.showIf || q.showIf(draft)),
  );
}

export function questionTitle(question: Question, draft: QuizDraft): string {
  return typeof question.title === "function" ? question.title(draft) : question.title;
}

export function canFinish(draft: QuizDraft, section?: QuizSectionId): boolean {
  return visibleQuestions(draft, section).every((q) => q.optional || q.isAnswered(draft));
}

export const DISABILITY_OPTIONS: { value: Disability; label: string }[] = [
  { value: "mobility", label: "Mobility or wheelchair use" },
  { value: "vision", label: "Blind or low vision" },
  { value: "hearing", label: "Deaf or hard of hearing" },
  { value: "cognitive", label: "Cognitive or developmental" },
  { value: "chronicIllness", label: "Chronic illness" },
  { value: "mentalHealth", label: "Mental health" },
  { value: "other", label: "Other" },
];

export const TRANSPORT_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "transit", label: "Transit" },
  { value: "bike", label: "Bike" },
  { value: "walk", label: "Walk" },
];

export const KEEP_ITEM_SUGGESTIONS = [
  "furniture",
  "car",
  "electronics",
  "clothes only",
  "sentimental items",
  "instruments",
  "medical or mobility equipment",
];

export const SPECIAL_NEEDS_SUGGESTIONS = ["medical", "dietary", "religious", "elder care"];

export const PET_SUGGESTIONS = ["dog", "cat", "other"];

export const CULTURE_SUGGESTIONS = [
  "food from home",
  "international grocery",
  "place of worship",
  "cultural community",
  "farmers market",
  "language exchange",
];
export const AMENITY_SUGGESTIONS = ["gaming", "board game cafe", "library", "bookstore", "arts and crafts", "fan meetups"];
export const RECREATION_SUGGESTIONS = ["gym", "martial arts", "running", "team sports", "yoga", "swimming", "hiking"];

export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "KRW", "JPY", "VND", "MXN", "AUD", "INR"];
