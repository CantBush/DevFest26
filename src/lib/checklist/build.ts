import type { Checklist, Profile, SectionId, Task } from "@/lib/types";
import { SECTION_ORDER } from "@/lib/types";
import { addDays, disabilitySentence } from "@/lib/checklist/profile";
import { SECTION_META, TASK_TEMPLATES, titleFor, type TemplateEntry } from "@/lib/checklist/template";

function summaryFor(entry: TemplateEntry, profile: Profile): string {
  const base = entry.summarize?.(profile) ?? entry.defaultSummary;
  const access = disabilitySentence(profile);
  if (!access || !entry.dependsOn.includes("household.disabilities")) return base;
  return `${base} ${access}`;
}

function taskFromTemplate(entry: TemplateEntry, profile: Profile): Task {
  const dueBy =
    entry.daysBeforeMove == null || !profile.moveDate
      ? undefined
      : addDays(profile.moveDate, -entry.daysBeforeMove);
  return {
    id: entry.id,
    sectionId: entry.sectionId,
    title: titleFor(entry, profile),
    summary: summaryFor(entry, profile),
    ...(dueBy ? { dueBy } : {}),
    priority: entry.priority,
    ...(entry.sublist ? { sublist: entry.sublist } : {}),
    detailKind: entry.detailKind,
    ...(entry.sprite ? { sprite: entry.sprite } : {}),
    source: "template",
  };
}

export function visibleTemplates(profile: Profile): TemplateEntry[] {
  return TASK_TEMPLATES.filter((entry) => entry.showIf?.(profile) ?? true);
}

// Fixed rules only. Gemini fills summaries later and may append ai.* tasks.
export function buildChecklist(profile: Profile, now = new Date()): Checklist {
  const tasksBySection = new Map<SectionId, Task[]>();
  for (const entry of visibleTemplates(profile)) {
    const list = tasksBySection.get(entry.sectionId) ?? [];
    list.push(taskFromTemplate(entry, profile));
    tasksBySection.set(entry.sectionId, list);
  }

  const sections = SECTION_ORDER.flatMap((id) => {
    const tasks = tasksBySection.get(id);
    if (!tasks || tasks.length === 0) return [];
    const meta = SECTION_META[id];
    return [
      {
        id,
        title: meta.title,
        sprite: meta.sprite,
        ...(meta.pinned ? { pinned: true } : {}),
        tasks,
      },
    ];
  });

  return {
    profileVersion: profile.version,
    generatedAt: now.toISOString(),
    sections,
  };
}
