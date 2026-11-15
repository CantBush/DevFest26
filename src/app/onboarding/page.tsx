"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { Mascot } from "@/components/Mascot";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { QuestionView } from "@/components/quiz/QuestionView";
import { useAppState } from "@/components/state/AppState";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";
import { profileFromDraft } from "@/lib/quiz/draft";
import { canFinish, visibleQuestions, type QuizDraft } from "@/lib/quiz/questions";
import type { Profile } from "@/lib/types";

function firstUnansweredIndex(draft: QuizDraft): number {
  const questions = visibleQuestions(draft);
  const i = questions.findIndex((q) => !q.optional && !q.isAnswered(draft));
  return i === -1 ? questions.length - 1 : i;
}

export default function OnboardingPage() {
  const app = useAppState();
  const router = useRouter();
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    if (app.ready && app.profile && !building) router.replace("/home");
  }, [app.ready, app.profile, building, router]);

  if (!app.ready || (app.profile && !building)) return <LoadingMascot fullScreen />;
  if (building) return <LoadingMascot fullScreen />;

  const build = async (profile: Profile) => {
    setBuilding(true);
    app.saveProfile(profile);
    await app.generatePlan(profile);
    router.replace("/home");
  };

  return <Quiz onBuild={build} />;
}

function Quiz({ onBuild }: { onBuild: (profile: Profile) => Promise<void> }) {
  const { draft, saveDraft } = useAppState();
  const hasStarted = Object.keys(draft).length > 0;
  const [started, setStarted] = useState(hasStarted);
  const [index, setIndex] = useState(() => (hasStarted ? firstUnansweredIndex(draft) : 0));
  const [error, setError] = useState<string | null>(null);

  if (!started) {
    return (
      <AppShell showHome={false}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Mascot sprite="box" size={140} className="animate-bob" />
          <div>
            <h1 className="text-4xl font-extrabold">Movingly</h1>
            <p className="mt-2 text-lg text-muted">
              A few questions about your move, then a checklist made just for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="min-h-12 w-full rounded-full bg-accent text-lg font-bold text-paper"
          >
            Start
          </button>
          <div className="flex flex-col gap-1 text-sm text-muted">
            <span>Or try a demo profile:</span>
            <div className="flex justify-center gap-3 font-semibold text-ink">
              <button type="button" className="underline" onClick={() => onBuild(sampleInternationalProfile)}>
                Seattle to Seoul
              </button>
              <button type="button" className="underline" onClick={() => onBuild(sampleDomesticProfile)}>
                Chicago to Austin
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const questions = visibleQuestions(draft);
  const i = Math.min(index, questions.length - 1);
  const question = questions[i];
  const sectionQuestions = questions.filter((q) => q.section === question.section);
  const fraction = (sectionQuestions.indexOf(question) + 1) / sectionQuestions.length;
  const answered = question.isAnswered(draft);
  const isLast = i === questions.length - 1;

  const next = () => {
    setError(null);
    setIndex(i + 1);
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    setError(null);
    if (i === 0) setStarted(false);
    else setIndex(i - 1);
  };

  const finish = async () => {
    if (!canFinish(draft)) {
      setError("A few required answers are missing.");
      setIndex(firstUnansweredIndex(draft));
      return;
    }
    try {
      await onBuild(profileFromDraft(draft, 1));
    } catch {
      setError("Something in your answers didn't look right. Please check them.");
    }
  };

  return (
    <AppShell showHome={false}>
      <div className="flex flex-1 flex-col gap-6">
        <ProgressBar section={question.section} fraction={fraction} />
        <QuestionView key={question.id} question={question} draft={draft} onChange={saveDraft} />
        {error && <p className="font-semibold text-warn">{error}</p>}

        <div className="mt-auto flex items-center gap-3 pt-4">
          <button type="button" onClick={back} className="min-h-12 rounded-full px-5 font-bold hover:bg-wash">
            Back
          </button>
          <div className="flex-1" />
          {isLast ? (
            <button
              type="button"
              onClick={finish}
              disabled={!question.optional && !answered}
              className="min-h-12 rounded-full bg-accent px-6 font-bold text-paper disabled:opacity-40"
            >
              Build my checklist
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!question.optional && !answered}
              className="min-h-12 rounded-full bg-ink px-6 font-bold text-paper disabled:opacity-30"
            >
              {question.optional && !answered ? "Skip" : "Next"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
