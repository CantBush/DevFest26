import { z } from "zod";

// Shared contract between the frontend and backend tracks (PLAN.md section 11).
// Change this file only in a small, separate commit and tell the other person.

export const MAX_PINS = 5;

export const PlaceRefSchema = z.object({
  placeId: z.string().optional(),
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  countryCode: z.string().length(2), // ISO 3166-1 alpha-2, e.g. "US"
});
export type PlaceRef = z.infer<typeof PlaceRefSchema>;

export const TransportModeSchema = z.enum(["car", "transit", "bike", "walk"]);
export type TransportMode = z.infer<typeof TransportModeSchema>;

export const PinSchema = z.object({
  id: z.string(),
  kind: z.enum(["job", "campus", "person", "other"]),
  label: z.string(),
  place: PlaceRefSchema,
  maxCommuteMin: z.number().int().min(5).max(180),
});
export type Pin = z.infer<typeof PinSchema>;

export const DisabilitySchema = z.enum([
  "mobility",
  "vision",
  "hearing",
  "cognitive",
  "chronicIllness",
  "mentalHealth",
  "other",
]);
export type Disability = z.infer<typeof DisabilitySchema>;

export const ProfileSchema = z.object({
  version: z.number().int().min(1),
  scope: z.enum(["domestic", "international"]),
  origin: PlaceRefSchema,
  moveDate: z.string().optional(), // ISO date (YYYY-MM-DD); absent means "not sure yet"
  currentHome: z.enum(["rent", "own", "other"]),
  destination: z.object({
    mode: z.enum(["address", "area"]),
    place: PlaceRefSchema,
  }),
  chosenArea: PlaceRefSchema.optional(), // set from the area search page, not the quiz
  pins: z.array(PinSchema).max(MAX_PINS),
  household: z.object({
    people: z.number().int().min(1),
    kids: z.array(z.object({ age: z.number().int().min(0).max(25) })),
    pets: z.array(z.object({ kind: z.string(), count: z.number().int().min(1) })),
    disabilities: z.array(DisabilitySchema),
    disabilityNotes: z.string().optional(),
    specialNeeds: z.array(z.string()),
    stayingBehind: z.array(z.string()),
  }),
  keepItems: z.array(z.string()), // international only; empty for domestic moves
  money: z.object({
    currency: z.string().length(3), // ISO 4217, e.g. "USD"
    moveBudget: z.number().min(0),
    housingIntent: z.enum(["rent", "buy"]),
    housingBudget: z.number().min(0), // monthly if rent, total if buy
    regulatedJob: z.boolean(),
  }),
  dailyLife: z.object({
    transport: z.array(TransportModeSchema).min(1),
    mainTransport: TransportModeSchema,
    culture: z.array(z.string()),
    amenities: z.array(z.string()),
    recreation: z.array(z.string()),
  }),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SectionIdSchema = z.enum([
  "visa",
  "moveOut",
  "packing",
  "housing",
  "paperwork",
  "health",
  "household",
  "moveIn",
]);
export type SectionId = z.infer<typeof SectionIdSchema>;

export const SECTION_ORDER: readonly SectionId[] = SectionIdSchema.options;

export const DetailKindSchema = z.enum([
  "generic",
  "factPack",
  "placeFinder",
  "commute",
  "fitCheck",
  "areaSearch",
  "packingList",
]);
export type DetailKind = z.infer<typeof DetailKindSchema>;

export const SpriteIdSchema = z.enum([
  "airplane",
  "box",
  "umbrella",
  "papers",
  "bandage",
  "paw",
  "food",
  "suitcase",
]);
export type SpriteId = z.infer<typeof SpriteIdSchema>;

export const SublistSchema = z.enum(["rent", "buy"]);

export const TaskSchema = z.object({
  id: z.string(),
  sectionId: SectionIdSchema,
  title: z.string(),
  summary: z.string(),
  dueBy: z.string().optional(), // ISO date
  priority: z.enum(["high", "normal"]),
  sublist: SublistSchema.optional(),
  detailKind: DetailKindSchema,
  sprite: SpriteIdSchema.optional(),
  source: z.enum(["template", "ai"]),
});
export type Task = z.infer<typeof TaskSchema>;

export const FactPackSchema = z.object({
  countryCode: z.string().length(2),
  visaOptions: z.array(z.object({ name: z.string(), forWho: z.string(), renewal: z.string() })),
  passportRule: z.object({
    minMonthsValidAfterEntry: z.number().int().nullable(),
    notes: z.string(),
  }),
  apostille: z.object({
    hagueConvention: z.boolean().nullable(),
    documents: z.array(z.string()),
    notes: z.string(),
  }),
  drivingRule: z.object({
    answer: z.enum(["local", "idp", "both", "unknown"]),
    notes: z.string(),
  }),
  petImport: z.string().optional(),
  medicationAndEquipment: z.string().optional(), // only when the profile lists disabilities
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
  generatedAt: z.string(),
});
export type FactPack = z.infer<typeof FactPackSchema>;

export const ChecklistSectionSchema = z.object({
  id: SectionIdSchema,
  title: z.string(),
  sprite: SpriteIdSchema,
  pinned: z.boolean().optional(),
  tasks: z.array(TaskSchema),
});
export type ChecklistSection = z.infer<typeof ChecklistSectionSchema>;

export const ChecklistSchema = z.object({
  profileVersion: z.number().int(),
  generatedAt: z.string(),
  sections: z.array(ChecklistSectionSchema),
  factPack: FactPackSchema.optional(),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const DetailBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), level: z.union([z.literal(1), z.literal(2)]), text: z.string() }),
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("steps"), items: z.array(z.string()) }),
  z.object({ type: z.literal("callout"), tone: z.enum(["info", "warning"]), text: z.string() }),
  z.object({ type: z.literal("places"), title: z.string(), placeIds: z.array(z.string()) }),
  z.object({
    type: z.literal("commute"),
    originLabel: z.string(),
    rows: z.array(
      z.object({ pinId: z.string(), minutes: z.number().nullable(), withinLimit: z.boolean() }),
    ),
  }),
  z.object({
    type: z.literal("neighborhoods"),
    items: z.array(
      z.object({
        name: z.string(),
        why: z.string(),
        estRent: z.string().optional(),
        placeId: z.string().optional(),
      }),
    ),
  }),
  z.object({ type: z.literal("passportCheck"), minMonthsAfterEntry: z.number().int() }),
  z.object({
    type: z.literal("packingItems"),
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        note: z.string().optional(),
        suggested: z.boolean().optional(), // added by Gemini on top of the quiz-based list
      }),
    ),
  }),
  z.object({
    type: z.literal("links"),
    items: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
]);
export type DetailBlock = z.infer<typeof DetailBlockSchema>;

export const PlaceInfoSchema = z.object({
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  rating: z.number().optional(),
  mapsUrl: z.string(),
  accessibility: z
    .object({
      entrance: z.boolean().optional(),
      parking: z.boolean().optional(),
      restroom: z.boolean().optional(),
    })
    .optional(),
});
export type PlaceInfo = z.infer<typeof PlaceInfoSchema>;

export const TaskDetailSchema = z.object({
  taskId: z.string(),
  location: z.object({ label: z.string(), lat: z.number(), lng: z.number() }).optional(),
  blocks: z.array(DetailBlockSchema),
  places: z.record(z.string(), PlaceInfoSchema), // keyed by placeId referenced in "places" blocks
  sources: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
  inputsHash: z.string(),
  generatedAt: z.string(),
});
export type TaskDetail = z.infer<typeof TaskDetailSchema>;

export const BookmarkSchema = z.object({
  id: z.string(), // "section:<sectionId>" or "task:<taskId>"
  href: z.string(),
  title: z.string(),
  sprite: SpriteIdSchema.optional(),
  createdAt: z.string(),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

// Template entries hold functions, so they are plain TypeScript, not zod.
export type TaskTemplate = {
  id: string;
  sectionId: SectionId;
  title: string;
  defaultSummary: string;
  sublist?: "rent" | "buy";
  showIf?: (profile: Profile) => boolean;
  dependsOn: string[]; // profile paths, e.g. "destination", "money.housingBudget"
  detailKind: DetailKind;
  sprite?: SpriteId;
};

// API route contracts (PLAN.md section 9). Every route requires
// `Authorization: Bearer <Firebase ID token>`.
export const PlanRequestSchema = z.object({ profile: ProfileSchema });
export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanResponse = Checklist;

export const TaskDetailRequestSchema = z.object({
  profile: ProfileSchema,
  taskId: z.string(),
  factPack: FactPackSchema.optional(),
});
export type TaskDetailRequest = z.infer<typeof TaskDetailRequestSchema>;
export type TaskDetailResponse = TaskDetail;

export const PlacesRequestSchema = z.object({
  query: z.string().min(1),
  near: z.object({ lat: z.number(), lng: z.number() }),
  radiusM: z.number().int().min(100).max(50000),
});
export type PlacesRequest = z.infer<typeof PlacesRequestSchema>;
export type PlacesResponse = { places: (PlaceInfo & { placeId: string })[] };

export const CommuteRequestSchema = z.object({
  origins: z.array(z.object({ label: z.string(), lat: z.number(), lng: z.number() })).min(1),
  pins: z.array(PinSchema).min(1).max(MAX_PINS),
  mode: TransportModeSchema,
});
export type CommuteRequest = z.infer<typeof CommuteRequestSchema>;
export type CommuteResponse = {
  rows: { originIndex: number; pinId: string; minutes: number | null; withinLimit: boolean }[];
};
