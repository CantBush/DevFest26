import type { Checklist, Profile, Task, TaskDetail } from "@/lib/types";
import { buildChecklist } from "@/lib/checklist/build";
import { hashInputs } from "@/lib/checklist/hash";
import { dependsOnFor } from "@/lib/checklist/template";

export type Regeneration = {
  checklist: Checklist;
  // Task ids whose cached detail page should be regenerated on next open,
  // including tasks that left the plan.
  staleTaskIds: string[];
  reuseFactPack: boolean;
};

function hashFor(profile: Profile, taskId: string): string {
  return hashInputs(profile, dependsOnFor(taskId));
}

export function isTaskDetailStale(detail: TaskDetail, profile: Profile): boolean {
  return detail.inputsHash !== hashFor(profile, detail.taskId);
}

function sameCountries(left: Profile, right: Profile): boolean {
  return (
    left.origin.countryCode === right.origin.countryCode &&
    left.destination.place.countryCode === right.destination.place.countryCode
  );
}

// Immediate checklist for Settings. Personalized text stays when the fields
// that task depends on did not change. /api/plan still refreshes wording.
// Checkmarks and bookmarks live in their own collections and are not touched.
export function regeneratePlan(oldProfile: Profile, newProfile: Profile, previous?: Checklist, now = new Date()): Regeneration {
  const next = buildChecklist(newProfile, now);
  const reuseFactPack =
    newProfile.scope === "international" && sameCountries(oldProfile, newProfile) && previous?.factPack != null;

  const previousTasks = new Map<string, Task>();
  for (const section of previous?.sections ?? []) {
    for (const task of section.tasks) previousTasks.set(task.id, task);
  }

  const stale = new Set<string>();
  const sections = next.sections.map((section) => ({
    ...section,
    tasks: section.tasks.map((task) => {
      const oldHash = hashFor(oldProfile, task.id);
      const newHash = hashFor(newProfile, task.id);
      const previousTask = previousTasks.get(task.id);
      if (oldHash !== newHash || !previousTask) {
        if (oldHash !== newHash) stale.add(task.id);
        return task;
      }
      return {
        ...task,
        summary: previousTask.summary,
        priority: previousTask.priority,
        ...(previousTask.dueBy ? { dueBy: previousTask.dueBy } : {}),
      };
    }),
  }));

  for (const [taskId, previousTask] of previousTasks) {
    if (previousTask.source === "ai") {
      const section = sections.find((item) => item.id === previousTask.sectionId);
      const hashChanged = hashFor(oldProfile, taskId) !== hashFor(newProfile, taskId);
      if (!section || hashChanged) {
        stale.add(taskId);
        continue;
      }
      if (!section.tasks.some((task) => task.id === taskId)) section.tasks.push(previousTask);
      continue;
    }
    const stillShown = sections.some((section) => section.tasks.some((task) => task.id === taskId));
    if (!stillShown) stale.add(taskId);
  }

  return {
    checklist: {
      ...next,
      sections,
      ...(reuseFactPack && previous?.factPack ? { factPack: previous.factPack } : {}),
    },
    staleTaskIds: [...stale],
    reuseFactPack,
  };
}
