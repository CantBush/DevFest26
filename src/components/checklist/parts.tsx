"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookmarkIcon, TriangleIcon } from "@/components/Icons";
import { Mascot } from "@/components/Mascot";
import { sectionHref, taskHref, useAppState } from "@/components/state/AppState";
import type { ChecklistSection, SpriteId, Task } from "@/lib/types";

// Crayon-style square like the clipboard sketch; the tick is drawn in marker.
function SketchBox({ checked, size = 34 }: { checked: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="shrink-0 overflow-visible">
      <path
        d="M5.5 6.2 C12 5.4 22 5.8 30.6 5.3 C31 13 30.4 22 30.9 30.4 C22 30.9 13 30.2 5.2 30.7 C5.6 22 5 13 5.5 6.2 Z"
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 7 C13 6.6 22 6.9 29.8 6.4 M29.9 7.5 C29.6 15 30 23 29.7 29.6"
        fill="none"
        stroke="var(--color-ink)"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      {checked && (
        <path
          className="tick-draw"
          d="M9 18.5 L15.5 25 L32 6"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
}) {
  const box = <SketchBox checked={checked} />;
  if (!onChange) return <span aria-label={label}>{box}</span>;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="-m-1.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
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
      className="flex min-h-20 items-center gap-4 rounded-2xl px-2 py-2 transition hover:bg-wash"
    >
      <Checkbox checked={complete} label={complete ? "Section complete" : "Section in progress"} />
      <span className="min-w-0 flex-1">
        <span
          className={`font-hand block text-[1.6rem] leading-tight tracking-wider uppercase ${
            complete ? "text-muted line-through decoration-accent decoration-2" : ""
          }`}
        >
          {section.title}
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          <ProgressDots done={done} total={total} />
          {done}/{total}
          {section.pinned && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">Pinned</span>
          )}
        </span>
      </span>
      <Mascot sprite={section.sprite} size={60} />
    </Link>
  );
}

function ProgressDots({ done, total }: { done: number; total: number }) {
  const shown = Math.min(total, 8);
  const filled = total === 0 ? 0 : Math.round((done / total) * shown);
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full border-[1.5px] border-ink ${i < filled ? "bg-accent" : "bg-transparent"}`}
        />
      ))}
    </span>
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
    <li className="flex items-start gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-wash">
      <div className="pt-0.5">
        <Checkbox checked={done} onChange={(v) => setTaskDone(task.id, v)} label={`Mark "${task.title}" done`} />
      </div>
      <Link href={taskHref(task.id)} className="min-w-0 flex-1 py-1">
        <span
          className={`block text-[1.05rem] font-bold ${done ? "text-muted line-through decoration-accent decoration-2" : ""}`}
        >
          {task.priority === "high" && !done && (
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle" aria-label="High priority" />
          )}
          {task.title}
        </span>
        <span className="line-clamp-1 text-sm text-muted">{task.summary}</span>
        {(due || task.source === "ai") && (
          <span className="mt-1 flex gap-2 text-xs font-semibold text-muted">
            {due && <span>Due {due}</span>}
            {task.source === "ai" && (
              <span className="rounded-full bg-note px-2 text-ink">Suggested for you</span>
            )}
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
        className="font-hand mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl px-2 text-left text-2xl tracking-wider uppercase hover:bg-wash"
      >
        <TriangleIcon open={open} size={18} />
        {title}
      </button>
      {open && <ul className="ml-5 border-l-2 border-dashed border-ink/30 pl-2">{children}</ul>}
    </li>
  );
}
