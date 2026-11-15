"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionView } from "@/components/quiz/QuestionView";
import { useAppState } from "@/components/state/AppState";
import { useRequireProfile } from "@/components/state/useRequireProfile";
import { draftFromProfile, profileFromDraft } from "@/lib/quiz/draft";
import { QUIZ_SECTIONS, canFinish, visibleQuestions, type QuizDraft, type QuizSectionId } from "@/lib/quiz/questions";
import { summarizeSection } from "@/lib/quiz/summary";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const app = useRequireProfile();
  const router = useRouter();
  const [editing, setEditing] = useState<QuizSectionId | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!app.ready || !app.profile) return <LoadingMascot fullScreen />;
  if (saving) return <LoadingMascot fullScreen messages={["Updating your checklist...", "Repacking the boxes..."]} />;

  const profile = app.profile;

  const save = async (next: Profile) => {
    setSaving(true);
    try {
      app.saveProfile(next);
      await app.regeneratePlan(profile, next);
      setEditing(null);
      setMessage("Checklist updated. Your checkmarks and bookmarks are kept.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the checklist.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return <SectionEditor section={editing} profile={profile} onCancel={() => setEditing(null)} onSave={save} />;
  }

  const startOver = () => {
    if (!window.confirm("Start over? This clears your answers, checklist, checkmarks, and bookmarks.")) return;
    app.resetAll();
    router.replace("/onboarding");
  };

  const linkGoogle = async () => setMessage(await app.linkGoogleAccount());

  return (
    <AppShell backHref="/home" title="Settings">
      {message && (
        <p role="status" className="sticky-note relative mb-5 p-3 text-sm font-semibold">
          {message}
        </p>
      )}

      <h2 className="mb-3 text-xl tracking-wider text-muted uppercase">Your answers</h2>
      <div className="flex flex-col gap-3">
        {QUIZ_SECTIONS.map((section) => (
          <section key={section.id} className="sketch-border bg-paper p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-2xl leading-tight">{section.title}</h3>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setEditing(section.id);
                }}
                className="btn btn-plain min-h-10 px-4 text-sm"
              >
                Edit
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {summarizeSection(profile, section.id).map((row) => (
                <div key={row.label} className="contents">
                  <dt className="font-semibold text-muted">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-xl tracking-wider text-muted uppercase">Account</h2>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={linkGoogle} className="btn btn-plain justify-start">
          Save my plan to my Google account
        </button>
        <button
          type="button"
          onClick={startOver}
          className="btn btn-plain justify-start border-warn text-warn shadow-[3px_3px_0_var(--color-warn)]"
        >
          Start over
        </button>
      </div>
    </AppShell>
  );
}

function SectionEditor({
  section,
  profile,
  onCancel,
  onSave,
}: {
  section: QuizSectionId;
  profile: Profile;
  onCancel: () => void;
  onSave: (profile: Profile) => Promise<void>;
}) {
  const { replaceDraft } = useAppState();
  const [draft, setDraft] = useState<QuizDraft>(() => draftFromProfile(profile));
  const [error, setError] = useState<string | null>(null);
  const title = QUIZ_SECTIONS.find((s) => s.id === section)?.title ?? "Edit";
  const questions = visibleQuestions(draft, section);

  const save = async () => {
    if (!canFinish(draft)) {
      setError("Please answer the required questions.");
      return;
    }
    try {
      const next = profileFromDraft(draft, profile.version + 1, profile);
      replaceDraft(draft);
      await onSave(next);
    } catch {
      setError("Something in your answers didn't look right. Please check them.");
    }
  };

  return (
    <AppShell title={`Edit: ${title}`} showHome={false} showSettings={false}>
      <div className="flex flex-col gap-10">
        {questions.map((q) => (
          <QuestionView
            key={q.id}
            question={q}
            draft={draft}
            headingLevel="h2"
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />
        ))}
      </div>
      {error && <p className="mt-4 font-semibold text-warn">{error}</p>}
      <div className="sticky bottom-0 mt-8 flex gap-3 bg-paper py-3">
        <button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-full font-bold hover:bg-wash">
          Cancel
        </button>
        <button type="button" onClick={save} className="btn btn-primary flex-1">
          Save changes
        </button>
      </div>
    </AppShell>
  );
}
