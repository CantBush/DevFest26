import type { Checklist, FactPack, Profile } from "@/lib/types";
import { buildChecklist } from "@/lib/checklist/build";
import { generateJson } from "@/lib/gemini/client";
import { demoChecklist, demoFixturesEnabled } from "@/lib/gemini/demo";
import { buildFactPack } from "@/lib/gemini/fact-pack";
import { mergePersonalization, PersonalizationSchema, type Personalization } from "@/lib/gemini/merge";
import { profileBrief, SYSTEM_GUARDRAILS } from "@/lib/gemini/prompts";

export type PlanDependencies = {
  demo: boolean;
  researchFactPack: (profile: Profile) => Promise<FactPack | undefined>;
  personalize: (profile: Profile, checklist: Checklist, factPack?: FactPack) => Promise<Personalization>;
};

async function defaultPersonalize(profile: Profile, checklist: Checklist, factPack?: FactPack): Promise<Personalization> {
  const tasks = checklist.sections.flatMap((section) =>
    section.tasks.map((task) => ({
      id: task.id,
      sectionId: task.sectionId,
      title: task.title,
      summary: task.summary,
      detailKind: task.detailKind,
    })),
  );
  return generateJson(
    PersonalizationSchema,
    `${SYSTEM_GUARDRAILS} You may rewrite summaries for the given task ids and add at most 2 extra tasks per section. You cannot remove tasks or reorder sections. Extra tasks must be things the person can do, not names of businesses.`,
    [
      `Profile: ${profileBrief(profile)}`,
      factPack ? `Fact pack (use this for country rules, do not add links): ${JSON.stringify(factPack)}` : "No fact pack.",
      `Template tasks: ${JSON.stringify(tasks)}`,
      "Write a short summary, an optional YYYY-MM-DD due date, and a priority for each template id you want to personalize.",
      "extraTasks is optional. Use it only for a step the template missed. Leave it empty when the template is enough.",
    ].join("\n\n"),
  );
}

const defaultDependencies: PlanDependencies = {
  demo: false,
  researchFactPack: buildFactPack,
  personalize: defaultPersonalize,
};

export async function createPlan(
  profile: Profile,
  options?: { previousFactPack?: FactPack; now?: Date; dependencies?: Partial<PlanDependencies> },
): Promise<Checklist> {
  const now = options?.now ?? new Date();
  const dependencies = { ...defaultDependencies, ...options?.dependencies };
  if (dependencies.demo || demoFixturesEnabled()) return demoChecklist(profile, now);

  const checklist = buildChecklist(profile, now);
  let factPack = options?.previousFactPack;
  if (profile.scope === "international" && !factPack) {
    try {
      factPack = await dependencies.researchFactPack(profile);
    } catch (error) {
      console.error("Fact pack failed.", error instanceof Error ? error.message : "Unknown error");
      factPack = undefined;
    }
  }

  try {
    const personalization = await dependencies.personalize(profile, checklist, factPack);
    return mergePersonalization(checklist, personalization, factPack);
  } catch (error) {
    console.error("Personalization failed. Using the template.", error instanceof Error ? error.message : "Unknown error");
    return factPack ? { ...checklist, factPack } : checklist;
  }
}
