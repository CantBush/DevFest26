"use client";

import Link from "next/link";
import { CloseIcon } from "@/components/Icons";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Mascot } from "@/components/Mascot";
import { AppShell } from "@/components/layout/AppShell";
import { findSection, findTask } from "@/components/state/AppState";
import { useRequireProfile } from "@/components/state/useRequireProfile";
import type { Bookmark, Checklist } from "@/lib/types";

function stillInPlan(bookmark: Bookmark, checklist: Checklist | null) {
  const [kind, id] = [bookmark.id.slice(0, bookmark.id.indexOf(":")), bookmark.id.slice(bookmark.id.indexOf(":") + 1)];
  return kind === "section" ? Boolean(findSection(checklist, id)) : Boolean(findTask(checklist, id));
}

export default function ImportantPage() {
  const app = useRequireProfile();
  if (!app.ready || !app.profile) return <LoadingMascot fullScreen />;

  const bookmarks = [...app.bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <AppShell backHref="/home" title="Important!">
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Mascot sprite="blob" size={120} />
          <p className="font-hand text-3xl">Nothing saved yet</p>
          <p className="text-muted">Tap the bookmark on any section or task page to keep it here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((b) => {
            const available = stillInPlan(b, app.checklist);
            const label = b.id.startsWith("section:") ? "Section" : "Task";
            const body = (
              <>
                {b.sprite && <Mascot sprite={b.sprite} size={36} />}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{b.title}</span>
                  <span className="text-xs font-semibold text-muted">
                    {available ? label : `${label} · no longer in your plan`}
                  </span>
                </span>
              </>
            );
            return (
              <li key={b.id} className={`sketch-border flex items-center gap-2 bg-paper pr-1 ${available ? "" : "opacity-50"}`}>
                {available ? (
                  <Link href={b.href} className="flex min-h-14 flex-1 items-center gap-3 px-3 py-2">
                    {body}
                  </Link>
                ) : (
                  <div className="flex min-h-14 flex-1 items-center gap-3 px-3 py-2">{body}</div>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${b.title} from Important`}
                  onClick={() => app.removeBookmark(b.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-wash"
                >
                  <CloseIcon size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
