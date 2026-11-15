import { z } from "zod";
import { SectionIdSchema, type Checklist, type FactPack, type SectionId, type Task } from "@/lib/types";
import { isIsoDate, stripUrls } from "@/lib/gemini/text";

export const PersonalizationSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      summary: z.string(),
      dueBy: z.string().optional(),
      priority: z.enum(["high", "normal"]).optional(),
    }),
  ),
  extraTasks: z.array(
    z.object({
      sectionId: SectionIdSchema,
      title: z.string(),
      summary: z.string(),
      dueBy: z.string().optional(),
      priority: z.enum(["high", "normal"]).optional(),
    }),
  ),
});

export type Personalization = z.infer<typeof PersonalizationSchema>;

const MAX_EXTRAS_PER_SECTION = 2;

function slug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "task";
}

function applyKnownTask(task: Task, update: Personalization["tasks"][number] | undefined): Task {
  if (!update) return task;
  const summary = stripUrls(update.summary);
  if (!summary) return task;
  return {
    ...task,
    summary,
    priority: update.priority ?? task.priority,
    ...(isIsoDate(update.dueBy) ? { dueBy: update.dueBy } : {}),
  };
}

// Keeps template tasks and section order. Unknown ids are dropped.
// At most two ai.* tasks are appended to each section.
export function mergePersonalization(checklist: Checklist, personalization: Personalization, factPack?: FactPack): Checklist {
  const updates = new Map<string, Personalization["tasks"][number]>();
  for (const task of personalization.tasks) updates.set(task.id, task);

  const extrasBySection = new Map<SectionId, Task[]>();
  for (const section of checklist.sections) extrasBySection.set(section.id, []);

  for (const extra of personalization.extraTasks) {
    const bucket = extrasBySection.get(extra.sectionId);
    if (!bucket || bucket.length >= MAX_EXTRAS_PER_SECTION) continue;
    const title = stripUrls(extra.title);
    const summary = stripUrls(extra.summary);
    if (!title || !summary) continue;
    const idBase = `ai.${extra.sectionId}.${slug(title)}`;
    let id = idBase;
    let suffix = 2;
    const taken = new Set(bucket.map((task) => task.id));
    while (taken.has(id) || checklist.sections.some((section) => section.tasks.some((task) => task.id === id))) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }
    bucket.push({
      id,
      sectionId: extra.sectionId,
      title,
      summary,
      priority: extra.priority ?? "normal",
      ...(isIsoDate(extra.dueBy) ? { dueBy: extra.dueBy } : {}),
      detailKind: "generic",
      source: "ai",
    });
  }

  return {
    ...checklist,
    ...(factPack ? { factPack } : {}),
    sections: checklist.sections.map((section) => ({
      ...section,
      tasks: [...section.tasks.map((task) => applyKnownTask(task, updates.get(task.id))), ...(extrasBySection.get(section.id) ?? [])],
    })),
  };
}
