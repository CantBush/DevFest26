import { z } from "zod";
import { FactPackSchema, type FactPack, type Profile } from "@/lib/types";
import { countryName, hasDisabilities } from "@/lib/checklist/profile";
import { generateJson, research, type ResearchResult } from "@/lib/gemini/client";
import { SYSTEM_GUARDRAILS } from "@/lib/gemini/prompts";
import { stripUrlsDeep } from "@/lib/gemini/text";

const FactDraftSchema = FactPackSchema.omit({
  sources: true,
  generatedAt: true,
  countryCode: true,
});

function hasPets(profile: Profile): boolean {
  return profile.household.pets.some((pet) => pet.count > 0);
}

export function factPackFromResearch(profile: Profile, draft: z.infer<typeof FactDraftSchema>, sources: ResearchResult["sources"], now = new Date()): FactPack {
  const cleaned = stripUrlsDeep(draft);
  const pack: FactPack = {
    ...cleaned,
    countryCode: profile.destination.place.countryCode,
    sources,
    generatedAt: now.toISOString(),
  };
  if (!hasPets(profile)) delete pack.petImport;
  if (!hasDisabilities(profile)) delete pack.medicationAndEquipment;
  else if (!pack.medicationAndEquipment) {
    pack.medicationAndEquipment =
      "Confirm the rules for bringing medication and medical or mobility equipment with an official government or embassy page. This check did not find a specific rule.";
  }
  return FactPackSchema.parse(pack);
}

export async function buildFactPack(profile: Profile, now = new Date()): Promise<FactPack | undefined> {
  if (profile.scope !== "international") return undefined;
  const origin = countryName(profile.origin.countryCode);
  const destination = countryName(profile.destination.place.countryCode);
  const purpose = profile.pins.map((pin) => pin.kind).join(", ") || "a move";
  const found = await research(
    `${SYSTEM_GUARDRAILS} Use Google Search. Prefer official government, embassy, and immigration pages. If you are not sure, say so in the text. Do not invent URLs.`,
    [
      `Research the move from ${origin} (${profile.origin.countryCode}) to ${destination} (${profile.destination.place.countryCode}).`,
      `Purpose hinted by pins: ${purpose}.`,
      profile.moveDate ? `Planned move date: ${profile.moveDate}.` : "Move date is not set.",
      hasPets(profile) ? `Pets: ${profile.household.pets.map((pet) => `${pet.count} ${pet.kind}`).join(", ")}.` : "No pets.",
      hasDisabilities(profile) ? "Someone moving has a disability. Include medication and medical or mobility equipment rules." : "No disabilities listed.",
      "Cover visa or permit options and renewal, passport validity after entry, apostille or document legalization, and whether driving needs a local license, an international driving permit, or both.",
    ].join("\n"),
  );
  if (!found.text.trim() && found.sources.length === 0) return undefined;

  const draft = await generateJson(
    FactDraftSchema,
    `${SYSTEM_GUARDRAILS} Turn the research notes into the fact pack. Do not add facts that are not in the notes. Use null when a yes/no rule was not found. Do not include URLs; sources are stored separately.`,
    `Destination country code: ${profile.destination.place.countryCode}\n\nResearch notes:\n${found.text}`,
  );
  return factPackFromResearch(profile, draft, found.sources, now);
}
