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
      <div className="mb-4 flex items-center gap-3">
        <Mascot sprite="box" size={56} />
        <div>
          <h1 className="text-2xl font-extrabold">Your move</h1>
          <p className="text-muted">
            To {destination}
            {days !== null && days > 0 && ` · ${days} days to go`}
          </p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {checklist.sections.map((section) => (
          <li key={section.id}>
            <SectionRow section={section} />
          </li>
        ))}
      </ul>

      <Link
        href="/important"
        className="sketch-border mt-6 flex min-h-14 items-center gap-3 bg-paper px-3 hover:bg-wash"
      >
        <BookmarkIcon />
        <span className="flex-1 text-lg font-extrabold underline decoration-2 underline-offset-4">Important!</span>
        <span className="text-sm font-semibold text-muted">{app.bookmarks.length}</span>
      </Link>
    </AppShell>
  );
}
