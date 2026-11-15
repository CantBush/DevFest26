import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Checklist, FactPack, Profile, TaskDetail } from "@/lib/types";
import { FactPackSchema, TaskDetailSchema } from "@/lib/types";
import { adminApp } from "@/lib/firebase/admin";
import { checklistFromDoc, profileFromUserDoc, withoutUndefined } from "@/lib/firebase/docs";
import { nextRegenerationCount } from "@/lib/firebase/regen-cap";

function database(): Firestore | null {
  try {
    return getFirestore(adminApp());
  } catch (error) {
    console.error("Firebase Admin is not configured.", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

export async function consumeRegeneration(uid: string, profileVersion: number): Promise<"ok" | "capped"> {
  const db = database();
  if (!db) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Could not check the regeneration cap.");
    }
    return "ok";
  }
  const ref = db.doc(`users/${uid}`);
  try {
    return await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const current = snap.exists ? Number(snap.get("regenerationCount") ?? 0) : 0;
      const next = nextRegenerationCount(current, profileVersion);
      if (!next.allowed) return "capped";
      if (next.count !== current) {
        transaction.set(ref, { regenerationCount: next.count }, { merge: true });
      }
      return "ok";
    });
  } catch (error) {
    console.error("Could not check the regeneration cap.", error instanceof Error ? error.message : "Unknown error");
    if (process.env.NODE_ENV === "production") throw new Error("Could not check the regeneration cap.");
    return "ok";
  }
}

export async function loadReusableFactPack(uid: string, profile: Profile): Promise<FactPack | undefined> {
  if (profile.scope !== "international") return undefined;
  const db = database();
  if (!db) return undefined;
  try {
    const [userSnap, planSnap] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(`users/${uid}/plan/current`).get(),
    ]);
    const storedProfile = profileFromUserDoc(userSnap.data());
    const checklist = checklistFromDoc(planSnap.data());
    const pack = FactPackSchema.safeParse(checklist?.factPack);
    if (!storedProfile || !pack.success) return undefined;
    const sameOrigin = storedProfile.origin.countryCode === profile.origin.countryCode;
    const sameDestination = storedProfile.destination.place.countryCode === profile.destination.place.countryCode;
    if (!sameOrigin || !sameDestination) return undefined;
    return pack.data;
  } catch (error) {
    console.error("Could not read the stored fact pack.", error instanceof Error ? error.message : "Unknown error");
    return undefined;
  }
}

export async function cachePlan(uid: string, checklist: Checklist): Promise<void> {
  const db = database();
  if (!db) return;
  try {
    await db.doc(`users/${uid}/plan/current`).set(withoutUndefined(checklist));
  } catch (error) {
    console.error("Could not cache the plan.", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function cachedTaskDetail(uid: string, taskId: string, inputsHash: string): Promise<TaskDetail | undefined> {
  const db = database();
  if (!db) return undefined;
  try {
    const snap = await db.doc(`users/${uid}/taskDetails/${taskId}`).get();
    const parsed = TaskDetailSchema.safeParse(snap.data());
    if (!parsed.success || parsed.data.inputsHash !== inputsHash) return undefined;
    return parsed.data;
  } catch (error) {
    console.error("Could not read a cached task detail.", error instanceof Error ? error.message : "Unknown error");
    return undefined;
  }
}

export async function cacheTaskDetail(uid: string, detail: TaskDetail): Promise<void> {
  const db = database();
  if (!db) return;
  try {
    await db.doc(`users/${uid}/taskDetails/${detail.taskId}`).set(withoutUndefined(detail));
  } catch (error) {
    console.error("Could not cache a task detail.", error instanceof Error ? error.message : "Unknown error");
  }
}
