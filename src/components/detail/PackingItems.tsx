"use client";

import { Checkbox } from "@/components/checklist/parts";
import { useAppState } from "@/components/state/AppState";
import { packingItemKey } from "@/lib/checklist/packing";
import type { DetailBlock } from "@/lib/types";

type Items = Extract<DetailBlock, { type: "packingItems" }>["items"];

export function PackingItems({ taskId, items }: { taskId: string; items: Items }) {
  const { progress, setTaskDone } = useAppState();
  const packed = items.filter((entry) => progress[packingItemKey(taskId, entry.id)]).length;

  const toggle = (id: string, done: boolean) => {
    setTaskDone(packingItemKey(taskId, id), done);
    if (done && packed + 1 === items.length) setTaskDone(taskId, true);
  };

  return (
    <section className="sketch-border bg-paper p-3">
      <p className="font-hand mb-1 px-1 text-xl tracking-wide text-muted" aria-live="polite">
        {packed} of {items.length} packed
      </p>
      <ul className="flex flex-col">
        {items.map((entry) => {
          const done = Boolean(progress[packingItemKey(taskId, entry.id)]);
          return (
            <li key={entry.id} className="flex items-start gap-3 rounded-xl px-1 py-1.5">
              <Checkbox checked={done} onChange={(value) => toggle(entry.id, value)} label={`Packed: ${entry.name}`} />
              <span className="min-w-0 flex-1 pt-2">
                <span className={`font-semibold ${done ? "text-muted line-through decoration-accent decoration-2" : ""}`}>
                  {entry.name}
                </span>
                {entry.suggested && (
                  <span className="ml-2 rounded-full bg-note px-2 py-0.5 align-middle text-xs font-bold">Suggested</span>
                )}
                {entry.note && <span className="block text-sm text-muted">{entry.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
