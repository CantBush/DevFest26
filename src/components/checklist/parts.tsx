"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookmarkIcon, CheckIcon, TriangleIcon } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { sectionHref, taskHref, useAppState } from "@/components/state/AppState";
import type { ChecklistSection, SpriteId, Task } from "@/lib/types";

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
}) {
  const box = (
    <span
      className={`sketch-border flex h-7 w-7 shrink-0 items-center justify-center ${checked ? "bg-ink text-paper" : "bg-paper"}`}
    >
      {checked && <CheckIcon size={18} strokeWidth={3} />}
    </span>
  );
  if (!onChange) return <span aria-label={label}>{box}</span>;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
    >
      {box}
    </button>
  );
}

export function BookmarkButton({
  id,
  href,
  title,
  sprite,
}: {
  id: string;
  href: string;
  title: string;
  sprite?: SpriteId;
}) {
  const { bookmarks, toggleBookmark } = useAppState();
  const saved = bookmarks.some((b) => b.id === id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from Important" : "Add to Important"}
      onClick={() => toggleBookmark({ id, href, title, sprite })}
      className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wash"
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

export function sectionProgress(section: ChecklistSection, progress: Record<string, boolean>) {
  const done = section.tasks.filter((t) => progress[t.id]).length;
  return { done, total: section.tasks.length, complete: section.tasks.length > 0 && done === section.tasks.length };
}

export function SectionRow({ section }: { section: ChecklistSection }) {
  const { progress } = useAppState();
  const { done, total, complete } = sectionProgress(section, progress);
  return (
    <Link
      href={sectionHref(section.id)}
      className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 hover:bg-wash"
    >
      <Checkbox checked={complete} label={complete ? "Section complete" : "Section in progress"} />
      <span className={`flex-1 text-lg font-bold ${complete ? "text-muted line-through" : ""}`}>
        {section.title}
        {section.pinned && (
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-xs font-bold text-accent">
            Pinned
          </span>
        )}
      </span>
      <span className="text-sm font-semibold text-muted">
        {done}/{total}
      </span>
      <Mascot sprite={section.sprite} size={40} />
    </Link>
  );
}

function formatDue(dueBy?: string) {
  if (!dueBy) return null;
  const date = new Date(`${dueBy}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TaskRow({ task }: { task: Task }) {
  const { progress, setTaskDone } = useAppState();
  const done = Boolean(progress[task.id]);
  const due = formatDue(task.dueBy);
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-wash">
      <div className="pt-1.5">
        <Checkbox checked={done} onChange={(v) => setTaskDone(task.id, v)} label={`Mark "${task.title}" done`} />
      </div>
      <Link href={taskHref(task.id)} className="min-w-0 flex-1 py-1">
        <span className={`block font-bold ${done ? "text-muted line-through" : ""}`}>
          {task.priority === "high" && !done && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-label="High priority" />
          )}
          {task.title}
        </span>
        <span className="line-clamp-1 text-sm text-muted">{task.summary}</span>
        {(due || task.source === "ai") && (
          <span className="mt-1 flex gap-2 text-xs font-semibold text-muted">
            {due && <span>Due {due}</span>}
            {task.source === "ai" && <span className="rounded bg-wash px-1.5">Suggested for you</span>}
          </span>
        )}
      </Link>
      {task.sprite && <Mascot sprite={task.sprite} size={32} className="mt-1" />}
    </li>
  );
}

export function Sublist({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left font-extrabold hover:bg-wash"
      >
        <TriangleIcon open={open} size={16} />
        {title}
      </button>
      {open && <ul className="ml-5 border-l-2 border-line pl-2">{children}</ul>}
    </li>
  );
}
