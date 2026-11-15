"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { Bookmark, Checklist, Profile, TaskDetail } from "@/lib/types";
import { BookmarkSchema, ChecklistSchema, ProfileSchema, TaskDetailSchema } from "@/lib/types";
import { ensureSignedIn, firestore, isFirebaseConfigured } from "@/lib/firebase/client";
import { bookmarkFromDoc, checklistFromDoc, profileFromUserDoc, progressFromDoc, taskDetailFromDoc, withoutUndefined } from "@/lib/firebase/docs";

export type Snapshot<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
};

const NOT_CONFIGURED = new Error(
  "Firebase is not configured. Copy .env.example to .env.local and fill in the NEXT_PUBLIC_FIREBASE_* values.",
);

function idleSnapshot<T>(data: T): Snapshot<T> {
  return isFirebaseConfigured ? { data, loading: true, error: null } : { data, loading: false, error: NOT_CONFIGURED };
}

export function useProfile(): Snapshot<Profile | null> {
  const [state, setState] = useState<Snapshot<Profile | null>>(() => idleSnapshot(null));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(firestore(), "users", user.uid),
          (snap) => setState({ data: snap.exists() ? profileFromUserDoc(snap.data()) : null, loading: false, error: null }),
          (error) => setState({ data: null, loading: false, error }),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: error instanceof Error ? error : new Error("Could not sign in.") });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

export function usePlan(): Snapshot<Checklist | null> {
  const [state, setState] = useState<Snapshot<Checklist | null>>(() => idleSnapshot(null));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(firestore(), "users", user.uid, "plan", "current"),
          (snap) => setState({ data: snap.exists() ? checklistFromDoc(snap.data()) : null, loading: false, error: null }),
          (error) => setState({ data: null, loading: false, error }),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: error instanceof Error ? error : new Error("Could not sign in.") });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

export function useProgress(): Snapshot<Record<string, boolean>> {
  const [state, setState] = useState<Snapshot<Record<string, boolean>>>(() => idleSnapshot({}));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          collection(firestore(), "users", user.uid, "progress"),
          (snap) => {
            const done: Record<string, boolean> = {};
            for (const item of snap.docs) done[item.id] = progressFromDoc(item.data());
            setState({ data: done, loading: false, error: null });
          },
          (error) => setState({ data: {}, loading: false, error }),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ data: {}, loading: false, error: error instanceof Error ? error : new Error("Could not sign in.") });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

export function useBookmarks(): Snapshot<Bookmark[]> {
  const [state, setState] = useState<Snapshot<Bookmark[]>>(() => idleSnapshot<Bookmark[]>([]));

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          collection(firestore(), "users", user.uid, "bookmarks"),
          (snap) => {
            const bookmarks = snap.docs
              .map((item) => bookmarkFromDoc(item.id, item.data()))
              .filter((item): item is Bookmark => item != null)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setState({ data: bookmarks, loading: false, error: null });
          },
          (error) => setState({ data: [], loading: false, error }),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ data: [], loading: false, error: error instanceof Error ? error : new Error("Could not sign in.") });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

export function useTaskDetail(taskId: string | null): Snapshot<TaskDetail | null> {
  const [state, setState] = useState<Snapshot<TaskDetail | null>>(() => idleSnapshot(null));
  const [trackedId, setTrackedId] = useState(taskId);
  if (trackedId !== taskId) {
    setTrackedId(taskId);
    setState(taskId ? idleSnapshot(null) : { data: null, loading: false, error: null });
  }

  useEffect(() => {
    if (!taskId || !isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(firestore(), "users", user.uid, "taskDetails", taskId),
          (snap) => setState({ data: snap.exists() ? taskDetailFromDoc(snap.data()) : null, loading: false, error: null }),
          (error) => setState({ data: null, loading: false, error }),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: error instanceof Error ? error : new Error("Could not sign in.") });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [taskId]);

  if (!taskId) return { data: null, loading: false, error: null };
  if (!isFirebaseConfigured) return { data: null, loading: false, error: NOT_CONFIGURED };
  return state;
}

async function userRef() {
  const user = await ensureSignedIn();
  return doc(firestore(), "users", user.uid);
}

export async function saveProfile(profile: Profile): Promise<void> {
  const parsed = ProfileSchema.parse(profile);
  const ref = await userRef();
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      profile: withoutUndefined(parsed),
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function savePlan(checklist: Checklist): Promise<void> {
  const parsed = ChecklistSchema.parse(checklist);
  const user = await ensureSignedIn();
  await setDoc(doc(firestore(), "users", user.uid, "plan", "current"), withoutUndefined(parsed));
}

export async function saveTaskDetail(detail: TaskDetail): Promise<void> {
  const parsed = TaskDetailSchema.parse(detail);
  if (parsed.taskId.includes("/")) throw new Error("Task id cannot contain a slash.");
  const user = await ensureSignedIn();
  await setDoc(doc(firestore(), "users", user.uid, "taskDetails", parsed.taskId), withoutUndefined(parsed));
}

export async function setTaskDone(taskId: string, done: boolean): Promise<void> {
  const user = await ensureSignedIn();
  await setDoc(doc(firestore(), "users", user.uid, "progress", taskId), {
    done,
    updatedAt: new Date().toISOString(),
  });
}

// Returns true when the page is bookmarked after the call.
export async function toggleBookmark(bookmark: Omit<Bookmark, "createdAt"> & { createdAt?: string }): Promise<boolean> {
  const user = await ensureSignedIn();
  const ref = doc(firestore(), "users", user.uid, "bookmarks", bookmark.id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await deleteDoc(ref);
    return false;
  }
  const parsed = BookmarkSchema.parse({
    ...bookmark,
    createdAt: bookmark.createdAt ?? new Date().toISOString(),
  });
  await setDoc(ref, {
    href: parsed.href,
    title: parsed.title,
    createdAt: parsed.createdAt,
    ...(parsed.sprite ? { sprite: parsed.sprite } : {}),
  });
  return true;
}

async function deleteCollection(uid: string, name: "taskDetails" | "progress" | "bookmarks"): Promise<void> {
  const snap = await getDocs(collection(firestore(), "users", uid, name));
  await Promise.all(snap.docs.map((item) => deleteDoc(item.ref)));
}

// Clears the profile, plan, cached details, checkmarks, and bookmarks.
export async function startOver(): Promise<void> {
  const user = await ensureSignedIn();
  await deleteCollection(user.uid, "taskDetails");
  await deleteCollection(user.uid, "progress");
  await deleteCollection(user.uid, "bookmarks");
  await deleteDoc(doc(firestore(), "users", user.uid, "plan", "current"));
  await deleteDoc(doc(firestore(), "users", user.uid));
}
