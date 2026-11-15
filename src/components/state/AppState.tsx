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
import { isTaskDetailStale, regeneratePlan as previewPlan } from "@/lib/checklist/regenerate";
import { ensureSignedIn, isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchPlaces, fetchPlan, fetchTaskDetail } from "@/lib/firebase/api";
import { savePlan, saveProfile as persistProfile, saveTaskDetail, startOver } from "@/lib/firebase/db";
import type { QuizDraft } from "@/lib/quiz/questions";
import {
  BookmarkSchema,
  ChecklistSchema,
  ProfileSchema,
  TaskDetailSchema,
  type Bookmark,
  type Checklist,
  type ChecklistSection,
  type PlacesResponse,
  type PlaceRef,
  type Profile,
  type Task,
  type TaskDetail,
} from "@/lib/types";

// Frontend data seam. Screens read and write through this provider. Plan and
// task pages come from the /api routes; localStorage keeps the latest copy and
// Firestore keeps a copy another device can load.

const STORAGE_KEY = "movingly:v2";

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

const subscribeNever = () => () => {};
const PLACE_SEARCH_RADIUS_M = 8000;

async function rememberPlan(profile: Profile, checklist: Checklist) {
  try {
    await persistProfile(profile);
    await savePlan(checklist);
  } catch (error) {
    console.error("Could not save the plan.", error);
  }
}

async function rememberDetail(detail: TaskDetail) {
  try {
    await saveTaskDetail(detail);
  } catch (error) {
    console.error("Could not save the task page.", error);
  }
}

function housingTaskIds(profile: Profile, checklist: Checklist): string[] {
  const visible = new Set(checklist.sections.flatMap((section) => section.tasks.map((task) => task.id)));
  const wanted = [
    profile.destination.mode === "address" ? "housing.fitCheck" : "housing.areaSearch",
    ...(profile.pins.length > 0 ? ["housing.commute"] : []),
  ];
  return wanted.filter((id) => visible.has(id));
}

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Partial<Record<keyof Stored, unknown>>;
    const pick = <T,>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
      const parsed = schema.safeParse(value);
      return parsed.success ? parsed.data : fallback;
    };
    const checklist = pick(ChecklistSchema.nullable(), data.checklist, null);
    return {
      draft: (data.draft as QuizDraft) ?? {},
      profile: pick(ProfileSchema.nullable(), data.profile, null),
      // Plans saved before the Packing List section existed are rebuilt by the home screen.
      checklist: checklist?.sections.some((section) => section.id === "packing") ? checklist : null,
      progress: pick(z.record(z.string(), z.boolean()), data.progress, {}),
      bookmarks: pick(z.array(BookmarkSchema), data.bookmarks, []),
      taskDetails: pick(z.record(z.string(), TaskDetailSchema), data.taskDetails, {}),
    };
  } catch {
    return EMPTY;
  }
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

  const openTask = useCallback(async (profile: Profile, taskId: string, factPack?: Checklist["factPack"]) => {
    const detail = await fetchTaskDetail(profile, taskId, factPack);
    setState((s) => ({ ...s, taskDetails: { ...s.taskDetails, [taskId]: detail } }));
    void rememberDetail(detail);
    return detail;
  }, []);

  const prefetchHousing = useCallback(
    (profile: Profile, checklist: Checklist) => {
      for (const taskId of housingTaskIds(profile, checklist)) {
        void openTask(profile, taskId, checklist.factPack).catch((error) => {
          console.error(`Could not prefetch ${taskId}.`, error);
        });
      }
    },
    [openTask],
  );

  const generatePlan = useCallback(
    async (profile: Profile) => {
      const checklist = await fetchPlan(profile);
      setState((s) => ({ ...s, profile, checklist }));
      void rememberPlan(profile, checklist);
      prefetchHousing(profile, checklist);
      return checklist;
    },
    [prefetchHousing],
  );

  const regeneratePlan = useCallback(
    async (oldProfile: Profile, newProfile: Profile) => {
      const preview = previewPlan(oldProfile, newProfile, stateRef.current.checklist ?? undefined);
      setState((s) => {
        const taskDetails = { ...s.taskDetails };
        for (const id of preview.staleTaskIds) delete taskDetails[id];
        return { ...s, profile: newProfile, checklist: preview.checklist, taskDetails };
      });
      const requestedVersion = newProfile.version;
      void fetchPlan(newProfile)
        .then((checklist) => {
          if (stateRef.current.profile?.version !== requestedVersion) return;
          setState((s) => ({ ...s, checklist }));
          void rememberPlan(newProfile, checklist);
          prefetchHousing(newProfile, checklist);
        })
        .catch((error) => {
          console.error("Could not refresh the personalized checklist.", error);
        });
      return preview.checklist;
    },
    [prefetchHousing],
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

  const loadTaskDetail = useCallback(
    async (task: Task) => {
      const { profile, checklist, taskDetails } = stateRef.current;
      if (!profile) throw new Error("Save a profile before opening a task.");
      const cached = taskDetails[task.id];
      if (cached && !isTaskDetailStale(cached, profile)) return cached;
      return openTask(profile, task.id, checklist?.factPack);
    },
    [openTask],
  );

  const searchPlaces = useCallback(async (query: string, near: { lat: number; lng: number }) => {
    const { places } = await fetchPlaces(query, near, PLACE_SEARCH_RADIUS_M);
    return places;
  }, []);

  const chooseArea = useCallback((place: PlaceRef) => {
    setState((s) => (s.profile ? { ...s, profile: { ...s.profile, chosenArea: place } } : s));
  }, []);

  const resetAll = useCallback(() => {
    setState(EMPTY);
    void startOver().catch(() => {});
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
