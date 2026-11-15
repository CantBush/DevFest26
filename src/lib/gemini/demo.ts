import type { Checklist, Profile, TaskDetail } from "@/lib/types";
import { buildChecklist } from "@/lib/checklist/build";
import { hashInputs, stableStringify } from "@/lib/checklist/hash";
import { dependsOnFor } from "@/lib/checklist/template";
import { sampleAreaSearchDetail, sampleChecklist, sampleDomesticProfile, sampleGenericDetail, sampleInternationalProfile } from "@/lib/fixtures";

export function demoFixturesEnabled(): boolean {
  return process.env.DEMO_FIXTURES === "true";
}

function sameDemoProfile(left: Profile, right: Profile): boolean {
  return stableStringify({ ...left, version: 1 }) === stableStringify({ ...right, version: 1 });
}

export function matchingDemo(profile: Profile): "international" | "domestic" | null {
  if (sameDemoProfile(profile, sampleInternationalProfile)) return "international";
  if (sameDemoProfile(profile, sampleDomesticProfile)) return "domestic";
  return null;
}

export function demoChecklist(profile: Profile, now = new Date()): Checklist {
  if (matchingDemo(profile) === "international") {
    return {
      ...sampleChecklist,
      profileVersion: profile.version,
      generatedAt: now.toISOString(),
    };
  }
  return buildChecklist(profile, now);
}

export function demoTaskDetail(profile: Profile, taskId: string, now = new Date()): TaskDetail | null {
  if (matchingDemo(profile) !== "international") return null;
  const saved = taskId === sampleAreaSearchDetail.taskId ? sampleAreaSearchDetail : taskId === sampleGenericDetail.taskId ? sampleGenericDetail : null;
  if (!saved) return null;
  return {
    ...saved,
    inputsHash: hashInputs(profile, dependsOnFor(taskId)),
    generatedAt: now.toISOString(),
  };
}
