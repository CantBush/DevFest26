"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Mascot } from "@/components/Mascot";
import { AppShell } from "@/components/layout/AppShell";
import { BookmarkButton, Sublist, TaskRow, sectionProgress } from "@/components/checklist/parts";
import { findSection, sectionHref } from "@/components/state/AppState";
import { useRequireProfile } from "@/components/state/useRequireProfile";

const SUBLIST_TITLES = { rent: "Rent", buy: "Buy" } as const;

export function SectionScreen() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const app = useRequireProfile();

  if (!app.ready || !app.profile) return <LoadingMascot fullScreen />;

  const section = findSection(app.checklist, sectionId);
  if (!section) {
    return (
      <AppShell backHref="/home" title="Not found">
        <p className="text-muted">This section isn&apos;t in your plan anymore.</p>
        <Link href="/home" className="mt-4 font-bold underline">
          Back to your checklist
        </Link>
      </AppShell>
    );
  }

  const { done, total } = sectionProgress(section, app.progress);
  const mainTasks = section.tasks.filter((t) => !t.sublist);
  const sublists = (["rent", "buy"] as const)
    .map((key) => ({ key, tasks: section.tasks.filter((t) => t.sublist === key) }))
    .filter((s) => s.tasks.length > 0);

  return (
    <AppShell
      backHref="/home"
      title={section.title}
      actions={
        <BookmarkButton
          id={`section:${section.id}`}
          href={sectionHref(section.id)}
          title={section.title}
          sprite={section.sprite}
        />
      }
    >
      <div className="mb-3 flex items-center gap-3">
        <Mascot sprite={section.sprite} size={56} />
        <p className="font-semibold text-muted">
          {done} of {total} done
        </p>
      </div>

      <ul className="flex flex-col gap-1">
        {mainTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {sublists.map((s) => (
          <Sublist key={s.key} title={SUBLIST_TITLES[s.key]}>
            {s.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Sublist>
        ))}
      </ul>
    </AppShell>
  );
}
