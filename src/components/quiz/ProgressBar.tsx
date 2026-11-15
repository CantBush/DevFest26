import { QUIZ_SECTIONS, type QuizSectionId } from "@/lib/quiz/questions";

// Four segments, one per quiz section; the current one fills as you go.
export function ProgressBar({ section, fraction }: { section: QuizSectionId; fraction: number }) {
  const current = QUIZ_SECTIONS.findIndex((s) => s.id === section);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {QUIZ_SECTIONS.map((s, i) => {
          const fill = i < current ? 1 : i === current ? fraction : 0;
          return (
            <div key={s.id} className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>
      <p className="text-sm font-semibold text-muted">
        {current + 1} of {QUIZ_SECTIONS.length}: {QUIZ_SECTIONS[current]?.title}
      </p>
    </div>
  );
}
