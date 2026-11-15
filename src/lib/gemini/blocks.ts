import type { DetailBlock, PlaceInfo, Task } from "@/lib/types";
import type { MapPlace } from "@/lib/maps/places";
import { VERIFY_TASK_IDS, VERIFY_WITH_SOURCE } from "@/lib/checklist/template";
import { stripUrls } from "@/lib/gemini/text";

export function placesRecord(places: MapPlace[]): Record<string, PlaceInfo> {
  return Object.fromEntries(
    places.map((place) => {
      const { placeId, ...info } = place;
      return [placeId, info];
    }),
  );
}

export function knownPlaces(places: MapPlace[], ids: string[]): MapPlace[] {
  const byId = new Map(places.map((place) => [place.placeId, place]));
  const picked: MapPlace[] = [];
  for (const id of ids) {
    const place = byId.get(id);
    if (place && !picked.some((item) => item.placeId === place.placeId)) picked.push(place);
  }
  return picked;
}

export function proseBlocks(task: Task, paragraphs: string[], steps: string[], warning?: string): DetailBlock[] {
  const blocks: DetailBlock[] = [
    { type: "heading", level: 1, text: stripUrls(task.title) || task.title },
    ...paragraphs.map((text) => ({ type: "text" as const, text: stripUrls(text) })).filter((block) => block.text),
  ];
  const cleanSteps = steps.map((step) => stripUrls(step)).filter(Boolean);
  if (cleanSteps.length > 0) blocks.push({ type: "steps", items: cleanSteps });
  if (warning && stripUrls(warning)) blocks.push({ type: "callout", tone: "warning", text: stripUrls(warning) });
  if (VERIFY_TASK_IDS.has(task.id)) blocks.push({ type: "callout", tone: "warning", text: VERIFY_WITH_SOURCE });
  return blocks;
}

export function fallbackBlocks(task: Task): DetailBlock[] {
  const sentences = task.summary
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const steps = sentences.length >= 2 ? sentences.slice(0, 6) : ["Do the action in the summary.", "Keep any confirmation.", "Check this off when it is done."];
  return proseBlocks(task, [task.summary], steps);
}
