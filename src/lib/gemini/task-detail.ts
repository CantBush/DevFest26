import { z } from "zod";
import type { DetailBlock, FactPack, PlaceInfo, Profile, Task, TaskDetail } from "@/lib/types";
import { buildChecklist } from "@/lib/checklist/build";
import { hashInputs } from "@/lib/checklist/hash";
import { focusPlace, hasDisabilities } from "@/lib/checklist/profile";
import { dependsOnFor, templateById } from "@/lib/checklist/template";
import { generateJson } from "@/lib/gemini/client";
import { demoFixturesEnabled, demoTaskDetail } from "@/lib/gemini/demo";
import { fallbackBlocks, knownPlaces, placesRecord, proseBlocks } from "@/lib/gemini/blocks";
import { SYSTEM_GUARDRAILS, profileBrief } from "@/lib/gemini/prompts";
import { labelEstimate, stripUrls } from "@/lib/gemini/text";
import { mapsSearchUrl } from "@/lib/maps/links";
import { dedupePlaces, searchNearby, searchText, type MapPlace } from "@/lib/maps/places";
import { commuteBetween, type CommuteLeg } from "@/lib/maps/routes";

export class UnknownTaskError extends Error {
  constructor(taskId: string) {
    super(`Unknown task: ${taskId}`);
    this.name = "UnknownTaskError";
  }
}

const ProseSchema = z.object({
  heading: z.string(),
  paragraphs: z.array(z.string()).max(4),
  steps: z.array(z.string()).max(8),
  warning: z.string().optional(),
});

const PickSchema = z.object({
  intro: z.string(),
  picks: z.array(z.object({ placeId: z.string(), because: z.string() })).max(6),
});

const FitSchema = z.object({
  summary: z.string(),
  pros: z.array(z.string()).max(5),
  cons: z.array(z.string()).max(5),
  placeIds: z.array(z.string()).max(8),
});

const NeighborhoodDraftSchema = z.object({
  neighborhoods: z.array(z.object({ name: z.string(), why: z.string(), estRent: z.string().optional() })).min(1).max(5),
});

const RankSchema = z.object({
  ranked: z.array(z.object({ placeId: z.string(), why: z.string(), estRent: z.string().optional() })).max(5),
});

type Services = {
  generateJson: (schema: z.ZodType, system: string, prompt: string) => Promise<unknown>;
  searchText: typeof searchText;
  searchNearby: typeof searchNearby;
  commuteBetween: typeof commuteBetween;
};

async function ask<T>(services: Services, schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
  return schema.parse(await services.generateJson(schema, system, prompt));
}

const liveServices: Services = { generateJson, searchText, searchNearby, commuteBetween };

export type TaskDetailInput = {
  profile: Profile;
  taskId: string;
  factPack?: FactPack;
  storedTask?: Task;
  now?: Date;
  services?: Partial<Services>;
};

function resolveTask(input: TaskDetailInput): Task {
  if (input.storedTask && input.storedTask.id === input.taskId) return input.storedTask;
  const fromTemplate = buildChecklist(input.profile, input.now).sections.flatMap((section) => section.tasks).find((task) => task.id === input.taskId);
  if (fromTemplate) return fromTemplate;
  const template = templateById(input.taskId);
  if (template) {
    return {
      id: template.id,
      sectionId: template.sectionId,
      title: template.title,
      summary: template.defaultSummary,
      priority: template.priority,
      detailKind: template.detailKind,
      ...(template.sublist ? { sublist: template.sublist } : {}),
      ...(template.sprite ? { sprite: template.sprite } : {}),
      source: "template",
    };
  }
  if (!input.taskId.startsWith("ai.")) throw new UnknownTaskError(input.taskId);
  const sectionId = input.taskId.split(".")[1];
  const section = ["visa", "moveOut", "housing", "paperwork", "health", "household", "moveIn"].find((id) => id === sectionId) ?? "moveIn";
  return {
    id: input.taskId,
    sectionId: section as Task["sectionId"],
    title: "An extra step for your move",
    summary: "A step added for this move.",
    priority: "normal",
    detailKind: "generic",
    source: "ai",
  };
}

function finish(task: Task, profile: Profile, blocks: DetailBlock[], places: Record<string, PlaceInfo>, now: Date, sources?: { title: string; url: string }[]): TaskDetail {
  const focus = focusPlace(profile);
  const referenced = new Set<string>();
  for (const block of blocks) {
    if (block.type === "places") block.placeIds.forEach((id) => referenced.add(id));
    if (block.type === "neighborhoods") block.items.forEach((item) => item.placeId && referenced.add(item.placeId));
  }
  const keptPlaces = Object.fromEntries(Object.entries(places).filter(([id]) => referenced.has(id)));
  return {
    taskId: task.id,
    location: { label: focus.label, lat: focus.lat, lng: focus.lng },
    blocks,
    places: keptPlaces,
    ...(sources && sources.length > 0 ? { sources } : {}),
    inputsHash: hashInputs(profile, dependsOnFor(task.id)),
    generatedAt: now.toISOString(),
  };
}

function interests(profile: Profile): string[] {
  return [...profile.dailyLife.culture, ...profile.dailyLife.amenities, ...profile.dailyLife.recreation].map((item) => item.trim()).filter(Boolean);
}

async function safeSearch(services: Services, run: () => Promise<MapPlace[]>): Promise<MapPlace[]> {
  try {
    return await run();
  } catch (error) {
    console.error("Places search failed.", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

async function genericDetail(task: Task, profile: Profile, factPack: FactPack | undefined, services: Services, now: Date): Promise<TaskDetail> {
  try {
    const prose = await ask(
      services,
      ProseSchema,
      SYSTEM_GUARDRAILS,
      `Task: ${task.title}\nTemplate summary: ${task.summary}\nProfile: ${profileBrief(profile)}\nFact pack: ${factPack ? JSON.stringify(factPack) : "none"}\nWrite heading, 1-3 short paragraphs, concrete steps, and an optional warning. No URLs.`,
    );
    const blocks = proseBlocks(task, [prose.heading, ...prose.paragraphs], prose.steps, prose.warning);
    return finish(task, profile, blocks, {}, now, factPack?.sources);
  } catch {
    return finish(task, profile, fallbackBlocks(task), {}, now, factPack?.sources);
  }
}

function factText(taskId: string, pack: FactPack): string {
  if (taskId === "visa.permit") {
    if (pack.visaOptions.length === 0) return "No visa options were confirmed. Check the official immigration site before you apply.";
    return pack.visaOptions.map((option) => `${option.name}: ${option.forWho} Renewal: ${option.renewal}`).join(" ");
  }
  if (taskId === "visa.passport") return pack.passportRule.notes;
  if (taskId === "visa.apostilles") return `${pack.apostille.notes} Documents mentioned: ${pack.apostille.documents.join(", ") || "none confirmed"}.`;
  if (taskId === "visa.driving") return pack.drivingRule.notes;
  return pack.passportRule.notes;
}

async function factDetail(task: Task, profile: Profile, factPack: FactPack | undefined, _services: Services, now: Date): Promise<TaskDetail> {
  if (!factPack) {
    const blocks = proseBlocks(
      task,
      ["Official country rules could not be loaded, so this page is the template reminder only."],
      ["Open the destination's official immigration or embassy page.", "Write down the rule that applies to you.", "Do not rely on this page alone."],
    );
    return finish(task, profile, blocks, {}, now);
  }
  const sources = factPack.sources.filter((source) => /^https?:\/\//.test(source.url));
  const blocks: DetailBlock[] = [
    ...proseBlocks(task, [factText(task.id, factPack)], ["Compare this with the official pages linked below.", "Write down the date you need to act by."]),
  ];
  if (task.id === "visa.passport" && factPack.passportRule.minMonthsValidAfterEntry != null) {
    blocks.push({ type: "passportCheck", minMonthsAfterEntry: factPack.passportRule.minMonthsValidAfterEntry });
  }
  if (sources.length > 0) blocks.push({ type: "links", items: sources.map((source) => ({ label: source.title, url: source.url })) });
  return finish(task, profile, blocks, {}, now, sources);
}

async function loadCommute(profile: Profile, origins: { label: string; lat: number; lng: number }[], services: Services): Promise<CommuteLeg[]> {
  if (profile.pins.length === 0 || origins.length === 0) return [];
  try {
    return await services.commuteBetween(origins, profile.pins, profile.dailyLife.mainTransport);
  } catch (error) {
    console.error("Commute lookup failed.", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

function commuteBlocks(legs: CommuteLeg[], origins: { label: string }[]): DetailBlock[] {
  const estimated = legs.some((leg) => leg.estimated);
  const blocks: DetailBlock[] = origins.flatMap((origin, originIndex) => {
    const rows = legs.filter((leg) => leg.originIndex === originIndex);
    if (rows.length === 0) return [];
    return [{ type: "commute" as const, originLabel: origin.label, rows: rows.map((row) => ({ pinId: row.pinId, minutes: row.minutes, withinLimit: row.withinLimit })) }];
  });
  if (estimated) {
    blocks.push({
      type: "callout",
      tone: "info",
      text: "Some times are straight-line estimates because a live route was not available. They are not traffic times.",
    });
  }
  return blocks;
}

async function gatherPlaceFinder(task: Task, profile: Profile, services: Services): Promise<{ title: string; places: MapPlace[] }[]> {
  const near = focusPlace(profile);
  const access = hasDisabilities(profile);
  const radius = 8000;
  const groups: { title: string; places: MapPlace[] }[] = [];
  const add = async (title: string, places: MapPlace[]) => {
    if (places.length > 0) groups.push({ title, places: dedupePlaces(places).slice(0, 5) });
  };

  if (task.id === "moveIn.grocery") {
    await add("Grocery stores", await safeSearch(services, () => services.searchNearby({ includedTypes: ["grocery_store"], near, radiusM: 4000, pageSize: 5, accessibility: access })));
  } else if (task.id === "moveIn.pharmacy") {
    await add("Pharmacies", await safeSearch(services, () => services.searchNearby({ includedTypes: ["pharmacy"], near, radiusM: 4000, pageSize: 5, accessibility: access })));
  } else if (task.id === "health.clinic") {
    await add("Clinics", await safeSearch(services, () => services.searchText({ query: "clinic", near, radiusM: radius, pageSize: 5, accessibility: access })));
  } else if (task.id === "household.school") {
    const ages = profile.household.kids.map((kid) => kid.age).join(", ");
    await add("Schools and childcare", await safeSearch(services, () => services.searchText({ query: `school or childcare for ages ${ages}`, near, radiusM: radius, accessibility: access })));
  } else if (task.id === "household.accessibility") {
    await add("Disability services", await safeSearch(services, () => services.searchText({ query: "disability services", near, radiusM: radius, accessibility: access })));
  } else if (task.id === "moveIn.transport") {
    const mode = profile.dailyLife.mainTransport;
    const query = mode === "car" ? "parking" : mode === "transit" ? "transit station" : mode === "bike" ? "bike shop" : "park";
    await add("Getting around", await safeSearch(services, () => services.searchText({ query, near, radiusM: radius, accessibility: access })));
  } else if (task.id === "moveIn.socialSpot") {
    const queries = interests(profile);
    const list = queries.length > 0 ? queries : ["community center"];
    const found: MapPlace[] = [];
    for (const query of list.slice(0, 4)) {
      found.push(...(await safeSearch(services, () => services.searchText({ query, near, radiusM: radius, pageSize: 3, accessibility: access }))));
    }
    await add("Social spots", found);
  } else {
    await add(task.title, await safeSearch(services, () => services.searchText({ query: task.title, near, radiusM: radius, accessibility: access })));
  }
  return groups;
}

async function placeFinderDetail(task: Task, profile: Profile, services: Services, now: Date): Promise<TaskDetail> {
  const groups = await gatherPlaceFinder(task, profile, services);
  const places = dedupePlaces(groups.flatMap((group) => group.places));
  if (places.length === 0) {
    return finish(task, profile, proseBlocks(task, ["No nearby places came back from the search, so none are listed."], ["Try the search field on this page.", "Widen the area if you have only a city so far."]), {}, now);
  }
  let picks = places.slice(0, 3);
  let intro = "These are nearby results from Places. They are not a ranking by Movingly.";
  try {
    const chosen = await ask(
      services,
      PickSchema,
      SYSTEM_GUARDRAILS,
      `Choose up to 3 placeIds from this list and say why each fits. Do not mention any place that is not in the list.\nProfile: ${profileBrief(profile)}\nPlaces: ${JSON.stringify(places.map((place) => ({ placeId: place.placeId, name: place.name, address: place.address })))}`,
    );
    const matched = knownPlaces(places, chosen.picks.map((pick) => pick.placeId)).slice(0, 3);
    if (matched.length > 0) {
      picks = matched;
      const because = chosen.picks
        .filter((pick) => matched.some((place) => place.placeId === pick.placeId))
        .map((pick) => stripUrls(pick.because))
        .filter(Boolean);
      intro = stripUrls(chosen.intro) || because.join(" ") || intro;
    }
  } catch {
    // Keep the first real results.
  }
  const blocks: DetailBlock[] = [
    ...proseBlocks(task, [intro], picks.map((place) => `Visit or call ${place.name} and confirm it still fits.`)),
    { type: "places", title: groups[0]?.title ?? "Nearby", placeIds: picks.map((place) => place.placeId) },
  ];
  return finish(task, profile, blocks, placesRecord(picks), now);
}

async function commuteDetail(task: Task, profile: Profile, services: Services, now: Date): Promise<TaskDetail> {
  const focus = focusPlace(profile);
  const legs = await loadCommute(profile, [focus], services);
  const passed = legs.filter((leg) => leg.withinLimit).length;
  const summary = profile.pins.length === 0 ? "Add a pin to compare commute times." : `${passed} of ${legs.length} trips are within the limit you set.`;
  return finish(task, profile, [...proseBlocks(task, [summary], ["Look at each pin.", "If a trip is over the limit, look at a closer area before you sign."]), ...commuteBlocks(legs, [focus])], {}, now);
}

async function fitDetail(task: Task, profile: Profile, services: Services, now: Date): Promise<TaskDetail> {
  const focus = focusPlace(profile);
  const access = hasDisabilities(profile);
  const legs = await loadCommute(profile, [focus], services);
  const essentials = dedupePlaces(
    (
      await Promise.all([
        safeSearch(services, () => services.searchNearby({ includedTypes: ["grocery_store"], near: focus, radiusM: 3000, pageSize: 3, accessibility: access })),
        safeSearch(services, () => services.searchNearby({ includedTypes: ["pharmacy"], near: focus, radiusM: 3000, pageSize: 3, accessibility: access })),
        safeSearch(services, () => services.searchNearby({ includedTypes: ["transit_station"], near: focus, radiusM: 3000, pageSize: 3, accessibility: access })),
      ])
    ).flat(),
  );
  const interestPlaces: MapPlace[] = [];
  for (const query of interests(profile).slice(0, 3)) {
    interestPlaces.push(...(await safeSearch(services, () => services.searchText({ query, near: focus, radiusM: 5000, pageSize: 3, accessibility: access }))));
  }
  const places = dedupePlaces([...essentials, ...interestPlaces]);
  let summary = `${focus.label} has ${legs.filter((leg) => leg.withinLimit).length} of ${legs.length} pin trips within your limit.`;
  let placeIds = places.slice(0, 6).map((place) => place.placeId);
  try {
    const fit = await ask(
      services,
      FitSchema,
      SYSTEM_GUARDRAILS,
      `Write a fit summary from these real commute numbers and places only.\nBudget: ${profile.money.housingBudget} ${profile.money.currency} (${profile.money.housingIntent}).\nCommute: ${JSON.stringify(legs)}\nPlaces: ${JSON.stringify(places.map((place) => ({ placeId: place.placeId, name: place.name })))}`,
    );
    summary = stripUrls(fit.summary) || summary;
    const matched = knownPlaces(places, fit.placeIds);
    if (matched.length > 0) placeIds = matched.map((place) => place.placeId);
    const pros = fit.pros.map((item) => stripUrls(item)).filter(Boolean);
    const cons = fit.cons.map((item) => stripUrls(item)).filter(Boolean);
    const blocks: DetailBlock[] = [
      ...proseBlocks(task, [summary], [...pros.map((item) => `Plus: ${item}`), ...cons.map((item) => `Watch: ${item}`)]),
      ...commuteBlocks(legs, [focus]),
    ];
    if (placeIds.length > 0) blocks.push({ type: "places", title: "Nearby", placeIds });
    return finish(task, profile, blocks, placesRecord(knownPlaces(places, placeIds)), now);
  } catch {
    const blocks: DetailBlock[] = [...proseBlocks(task, [summary], ["Compare the commute table with your limits."]), ...commuteBlocks(legs, [focus])];
    if (placeIds.length > 0) blocks.push({ type: "places", title: "Nearby", placeIds });
    return finish(task, profile, blocks, placesRecord(knownPlaces(places, placeIds)), now);
  }
}

async function areaDetail(task: Task, profile: Profile, services: Services, now: Date): Promise<TaskDetail> {
  const city = profile.destination.place;
  let drafts: z.infer<typeof NeighborhoodDraftSchema>["neighborhoods"] = [];
  try {
    const suggested = await ask(
      services,
      NeighborhoodDraftSchema,
      `${SYSTEM_GUARDRAILS} Suggest 4 or 5 neighborhood or district names inside the named area. Do not name apartment buildings, businesses, or URLs.`,
      `Area: ${city.label}. Budget: ${profile.money.housingBudget} ${profile.money.currency} per ${profile.money.housingIntent === "rent" ? "month" : "purchase"}. Household size: ${profile.household.people}. Transport: ${profile.dailyLife.mainTransport}. Pins: ${profile.pins.map((pin) => pin.label).join(", ") || "none"}. Interests: ${interests(profile).join(", ") || "none"}.`,
    );
    drafts = suggested.neighborhoods;
  } catch {
    return finish(
      task,
      profile,
      proseBlocks(task, ["Neighborhood suggestions are unavailable right now, so none are listed."], [`Search in ${city.label} near your pins.`, "Pick an area on the map, then open the commute task."]),
      {},
      now,
    );
  }

  const located: { name: string; why: string; estRent?: string; place: MapPlace }[] = [];
  for (const draft of drafts) {
    const found = await safeSearch(services, () =>
      services.searchText({ query: `${draft.name}, ${city.label}`, near: city, radiusM: 40000, pageSize: 1 }),
    );
    const place = found[0];
    if (!place) continue;
    located.push({ name: stripUrls(draft.name) || place.name, why: stripUrls(draft.why), estRent: labelEstimate(draft.estRent), place });
  }
  if (located.length === 0) {
    return finish(task, profile, proseBlocks(task, ["None of the suggested area names matched a place on the map, so none are listed."], [`Search ${city.label} yourself from the search field.`]), {}, now);
  }

  const locatedLegs = await loadCommute(
    profile,
    located.map((item) => ({ label: item.name, lat: item.place.lat, lng: item.place.lng })),
    services,
  );
  let ranked = located;
  try {
    const ranking = await ask(
      services,
      RankSchema,
      SYSTEM_GUARDRAILS,
      `Rank these real neighborhoods using the commute numbers. Refer to them only by placeId.\n${JSON.stringify(
        located.map((item, index) => ({
          placeId: item.place.placeId,
          name: item.name,
          commutes: locatedLegs.filter((leg) => leg.originIndex === index),
        })),
      )}`,
    );
    const order = knownPlaces(
      located.map((item) => item.place),
      ranking.ranked.map((item) => item.placeId),
    );
    if (order.length > 0) {
      ranked = order.map((place) => {
        const original = located.find((item) => item.place.placeId === place.placeId)!;
        const update = ranking.ranked.find((item) => item.placeId === place.placeId);
        return {
          ...original,
          why: stripUrls(update?.why ?? "") || original.why,
          estRent: labelEstimate(update?.estRent) ?? original.estRent,
        };
      });
    }
  } catch {
    // Keep the geocoded list in its original order.
  }

  const top = ranked[0];
  const nearby: MapPlace[] = [];
  if (top) {
    nearby.push(...(await safeSearch(services, () => services.searchText({ query: `apartments near ${top.name}`, near: top.place, radiusM: 5000, pageSize: 3 }))));
    for (const interest of interests(profile).slice(0, 3)) {
      nearby.push(...(await safeSearch(services, () => services.searchText({ query: interest, near: top.place, radiusM: 5000, pageSize: 2, accessibility: hasDisabilities(profile) }))));
    }
  }
  const extraPlaces = dedupePlaces(nearby).filter((place) => !ranked.some((item) => item.place.placeId === place.placeId)).slice(0, 4);
  const allPlaces = dedupePlaces([...ranked.map((item) => item.place), ...extraPlaces]);
  const rankedIndex = new Map(ranked.map((item, index) => [item.place.placeId, index]));
  const rankedLegs = locatedLegs.flatMap((leg) => {
    const placeId = located[leg.originIndex]?.place.placeId;
    const originIndex = placeId ? rankedIndex.get(placeId) : undefined;
    if (originIndex == null) return [];
    return [{ ...leg, originIndex }];
  });
  const blocks: DetailBlock[] = [
    { type: "heading", level: 1, text: task.title },
    { type: "text", text: `These areas are real Places results in ${city.label}. Rent figures are labeled estimates, not listings.` },
    {
      type: "neighborhoods",
      items: ranked.map((item) => ({
        name: item.name,
        why: item.why || "Included because the map found this area.",
        ...(item.estRent ? { estRent: item.estRent } : {}),
        placeId: item.place.placeId,
      })),
    },
    ...commuteBlocks(
      rankedLegs,
      ranked.map((item) => ({ label: item.name })),
    ),
  ];
  if (extraPlaces.length > 0) {
    blocks.push({ type: "places", title: top ? `Near ${top.name}` : "Nearby", placeIds: extraPlaces.map((place) => place.placeId) });
  }
  blocks.push({
    type: "links",
    items: ranked.map((item) => ({ label: `Apartments near ${item.name} (Google Maps)`, url: mapsSearchUrl(`apartments near ${item.name} ${city.label}`) })),
  });
  blocks.push({ type: "callout", tone: "info", text: "Rent ranges are AI estimates. Check current listings before deciding." });
  return finish(task, profile, blocks, placesRecord(allPlaces), now);
}

export async function createTaskDetail(input: TaskDetailInput): Promise<TaskDetail> {
  const now = input.now ?? new Date();
  const saved = demoFixturesEnabled() ? demoTaskDetail(input.profile, input.taskId, now) : null;
  if (saved) return saved;
  const task = resolveTask(input);
  const services = { ...liveServices, ...input.services };
  if (demoFixturesEnabled()) return finish(task, input.profile, fallbackBlocks(task), {}, now, input.factPack?.sources);

  switch (task.detailKind) {
    case "factPack":
      return factDetail(task, input.profile, input.factPack, services, now);
    case "placeFinder":
      return placeFinderDetail(task, input.profile, services, now);
    case "commute":
      return commuteDetail(task, input.profile, services, now);
    case "fitCheck":
      return fitDetail(task, input.profile, services, now);
    case "areaSearch":
      return areaDetail(task, input.profile, services, now);
    case "generic":
      return genericDetail(task, input.profile, input.factPack, services, now);
  }
}
