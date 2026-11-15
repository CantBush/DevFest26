"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BookmarkIcon } from "@/components/Icons";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Mascot } from "@/components/Mascot";
import { AppShell } from "@/components/layout/AppShell";
import { SectionRow } from "@/components/checklist/parts";
import { useRequireProfile } from "@/components/state/useRequireProfile";

function daysUntil(isoDate?: string) {
  if (!isoDate) return null;
  const ms = new Date(`${isoDate}T00:00:00`).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function HomePage() {
  const app = useRequireProfile();
  const requested = useRef(false);
  const { ready, profile, checklist, generatePlan } = app;

  useEffect(() => {
    if (ready && profile && !checklist && !requested.current) {
      requested.current = true;
      void generatePlan(profile);
    }
  }, [ready, profile, checklist, generatePlan]);

  if (!ready || !profile || !checklist) return <LoadingMascot fullScreen />;

  const days = daysUntil(profile.moveDate);
  const destination = profile.chosenArea?.label ?? profile.destination.place.label;

  return (
    <AppShell showHome={false} showSettings>
      <div className="mb-5 flex items-end justify-between gap-3 border-b-2 border-dashed border-line pb-4">
        <div className="min-w-0">
          <h1 className="text-4xl leading-none">My move</h1>
          <p className="mt-1 truncate font-semibold text-muted">to {destination}</p>
        </div>
        {days !== null && days > 0 && (
          <div className="sketch-border shrink-0 rotate-2 bg-accent-soft px-3 py-1 text-center">
            <span className="font-hand block text-3xl leading-none text-accent">{days}</span>
            <span className="text-xs font-bold">days to go</span>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {checklist.sections.map((section) => (
          <li key={section.id}>
            <SectionRow section={section} />
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-end gap-2">
        <Link
          href="/important"
          className="sticky-note relative flex min-h-16 flex-1 items-center gap-3 px-4 py-3 transition hover:rotate-0"
        >
          <span className="tape" aria-hidden="true" />
          <BookmarkIcon filled={app.bookmarks.length > 0} />
          <span className="font-hand flex-1 text-2xl tracking-wide">Important!</span>
          <span className="rounded-full bg-paper/70 px-2.5 py-0.5 text-sm font-bold">{app.bookmarks.length}</span>
        </Link>
        <Mascot sprite="hello" size={72} className="-mb-1" />
      </div>
    </AppShell>
  );
}
