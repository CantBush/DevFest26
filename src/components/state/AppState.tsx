"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { z } from "zod";
import { ensureSignedIn, isFirebaseConfigured } from "@/lib/firebase/client";
import { sampleAreaSearchDetail, sampleChecklist, sampleGenericDetail } from "@/lib/fixtures";
import type { QuizDraft } from "@/lib/quiz/questions";
import {
  BookmarkSchema,
  ChecklistSchema,
  ProfileSchema,
  TaskDetailSchema,
  type Bookmark,
  type Checklist,
  type ChecklistSection,
  type DetailBlock,
  type PlacesResponse,
  type PlaceRef,
  type Profile,
  type Task,
  type TaskDetail,
} from "@/lib/types";

// Frontend data seam. Every screen reads and writes through this provider.
// Until Phase 2 (PLAN.md section 3.5) it persists to localStorage and answers with
// fixtures; integration swaps these internals for Person B's src/lib/firebase/db.ts
// hooks and the /api routes without touching the screens.

const STORAGE_KEY = "movingly:v1";
const FAKE_PLAN_DELAY_MS = 1800;
const FAKE_DETAIL_DELAY_MS = 900;

type Stored = {
  draft: QuizDraft;
  profile: Profile | null;
  checklist: Checklist | null;
  progress: Record<string, boolean>;
  bookmarks: Bookmark[];
  taskDetails: Record<string, TaskDetail>;
};

const EMPTY: Stored = {
  draft: {},
  profile: null,
  checklist: null,
  progress: {},
  bookmarks: [],
  taskDetails: {},
};

type AppStateValue = Stored & {
  ready: boolean;
  saveDraft: (patch: Partial<QuizDraft>) => void;
  replaceDraft: (draft: QuizDraft) => void;
  saveProfile: (profile: Profile) => void;
  generatePlan: (profile: Profile) => Promise<Checklist>;
  regeneratePlan: (oldProfile: Profile, newProfile: Profile) => Promise<Checklist>;
  setTaskDone: (taskId: string, done: boolean) => void;
  toggleBookmark: (bookmark: Omit<Bookmark, "createdAt">) => void;
  removeBookmark: (id: string) => void;
  loadTaskDetail: (task: Task) => Promise<TaskDetail>;
  searchPlaces: (query: string, near: { lat: number; lng: number }) => Promise<PlacesResponse["places"]>;
  chooseArea: (place: PlaceRef) => void;
  resetAll: () => void;
  linkGoogleAccount: () => Promise<string>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const subscribeNever = () => () => {};

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Partial<Record<keyof Stored, unknown>>;
    const pick = <T,>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
      const parsed = schema.safeParse(value);
      return parsed.success ? parsed.data : fallback;
    };
    return {
      draft: (data.draft as QuizDraft) ?? {},
      profile: pick(ProfileSchema.nullable(), data.profile, null),
      checklist: pick(ChecklistSchema.nullable(), data.checklist, null),
      progress: pick(z.record(z.string(), z.boolean()), data.progress, {}),
      bookmarks: pick(z.array(BookmarkSchema), data.bookmarks, []),
      taskDetails: pick(z.record(z.string(), TaskDetailSchema), data.taskDetails, {}),
    };
  } catch {
    return EMPTY;
  }
}

function placeholderDetail(task: Task, profile: Profile | null, checklist: Checklist | null): TaskDetail {
  const place = profile?.chosenArea ?? profile?.destination.place;
  const factPack = checklist?.factPack;
  const blocks: DetailBlock[] = [
    { type: "heading", level: 1, text: task.title },
    { type: "text", text: task.summary },
  ];

  if (task.detailKind === "factPack" && factPack) {
    if (task.id === "visa.permit") {
      blocks.push({ type: "heading", level: 2, text: "Visa options" });
      blocks.push({ type: "steps", items: factPack.visaOptions.map((v) => `${v.name}: ${v.forWho}. ${v.renewal}`) });
    }
    if (task.id === "visa.passport" && factPack.passportRule.minMonthsValidAfterEntry !== null) {
      blocks.push({ type: "passportCheck", minMonthsAfterEntry: factPack.passportRule.minMonthsValidAfterEntry });
    }
    blocks.push({ type: "callout", tone: "info", text: factPack.passportRule.notes });
  }

  blocks.push({
    type: "callout",
    tone: "info",
    text: "Sample page. Personalized guidance appears here once the backend is connected.",
  });

  return {
    taskId: task.id,
    location: place ? { label: place.label, lat: place.lat, lng: place.lng } : undefined,
    blocks,
    places: {},
    sources: task.detailKind === "factPack" ? factPack?.sources : undefined,
    inputsHash: "placeholder",
    generatedAt: new Date().toISOString(),
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  // The server and the hydration render both see ready=false (screens show the
  // loading mascot), so reading localStorage up front can't cause a mismatch.
  const [state, setState] = useState<Stored>(() => (typeof window === "undefined" ? EMPTY : readStored()));
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const saveDraft = useCallback((patch: Partial<QuizDraft>) => {
    setState((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
  }, []);

  const replaceDraft = useCallback((draft: QuizDraft) => {
    setState((s) => ({ ...s, draft }));
  }, []);

  const saveProfile = useCallback((profile: Profile) => {
    setState((s) => ({ ...s, profile }));
  }, []);

  const generatePlan = useCallback(async (profile: Profile) => {
    await delay(FAKE_PLAN_DELAY_MS);
    const checklist: Checklist = {
      ...sampleChecklist,
      profileVersion: profile.version,
      generatedAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, checklist }));
    return checklist;
  }, []);

  const regeneratePlan = useCallback(
    async (_oldProfile: Profile, newProfile: Profile) => {
      // Checkmarks and bookmarks are keyed by task id, so they survive a rebuild.
      setState((s) => ({ ...s, taskDetails: {} }));
      return generatePlan(newProfile);
    },
    [generatePlan],
  );

  const setTaskDone = useCallback((taskId: string, done: boolean) => {
    setState((s) => ({ ...s, progress: { ...s.progress, [taskId]: done } }));
  }, []);

  const toggleBookmark = useCallback((bookmark: Omit<Bookmark, "createdAt">) => {
    setState((s) => {
      const exists = s.bookmarks.some((b) => b.id === bookmark.id);
      return {
        ...s,
        bookmarks: exists
          ? s.bookmarks.filter((b) => b.id !== bookmark.id)
          : [...s.bookmarks, { ...bookmark, createdAt: new Date().toISOString() }],
      };
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setState((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
  }, []);

  const loadTaskDetail = useCallback(async (task: Task) => {
    const cached = stateRef.current.taskDetails[task.id];
    if (cached) return cached;
    await delay(FAKE_DETAIL_DELAY_MS);
    const { profile, checklist } = stateRef.current;
    const detail =
      task.id === sampleAreaSearchDetail.taskId
        ? sampleAreaSearchDetail
        : task.id === sampleGenericDetail.taskId
          ? sampleGenericDetail
          : placeholderDetail(task, profile, checklist);
    setState((s) => ({ ...s, taskDetails: { ...s.taskDetails, [task.id]: detail } }));
    return detail;
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    await delay(300);
    const q = query.trim().toLowerCase();
    return Object.entries(sampleAreaSearchDetail.places)
      .filter(([, p]) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .map(([placeId, p]) => ({ placeId, ...p }));
  }, []);

  const chooseArea = useCallback((place: PlaceRef) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, chosenArea: place } } : s));
  }, []);

  const resetAll = useCallback(() => {
    setState(EMPTY);
  }, []);

  const linkGoogleAccount = useCallback(async () => {
    if (!isFirebaseConfigured) return "Sign-in isn't set up yet. Add the Firebase keys to .env.local.";
    try {
      const user = await ensureSignedIn();
      if (user.providerData.some((p) => p.providerId === "google.com")) return "Already linked to Google.";
      await linkWithPopup(user, new GoogleAuthProvider());
      return "Linked. Your plan is saved to your Google account.";
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/credential-already-in-use") return "That Google account already has a Movingly plan.";
      if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
      return "Couldn't link your Google account. Try again.";
    }
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      ready,
      saveDraft,
      replaceDraft,
      saveProfile,
      generatePlan,
      regeneratePlan,
      setTaskDone,
      toggleBookmark,
      removeBookmark,
      loadTaskDetail,
      searchPlaces,
      chooseArea,
      resetAll,
      linkGoogleAccount,
    }),
    [
      state,
      ready,
      saveDraft,
      replaceDraft,
      saveProfile,
      generatePlan,
      regeneratePlan,
      setTaskDone,
      toggleBookmark,
      removeBookmark,
      loadTaskDetail,
      searchPlaces,
      chooseArea,
      resetAll,
      linkGoogleAccount,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("useAppState must be used inside <AppStateProvider>");
  return value;
}

export function findSection(checklist: Checklist | null, sectionId: string): ChecklistSection | undefined {
  return checklist?.sections.find((s) => s.id === sectionId);
}

export function findTask(
  checklist: Checklist | null,
  taskId: string,
): { task: Task; section: ChecklistSection } | undefined {
  for (const section of checklist?.sections ?? []) {
    const task = section.tasks.find((t) => t.id === taskId);
    if (task) return { task, section };
  }
  return undefined;
}

export const sectionHref = (sectionId: string) => `/section/${sectionId}`;
export const taskHref = (taskId: string) => `/task/${encodeURIComponent(taskId)}`;
