"use client";

import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

const DEFAULT_MESSAGES = [
  "Packing your checklist...",
  "Asking around the neighborhood...",
  "Labeling the boxes...",
  "Checking the commute...",
];

export function LoadingMascot({
  messages = DEFAULT_MESSAGES,
  fullScreen = false,
}: {
  messages?: string[];
  fullScreen?: boolean;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, []);

  const frame = tick % 2 === 0 ? "carry-1" : "carry-2";
  const message = messages[Math.floor(tick / 6) % messages.length];

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-board"
          : "flex flex-col items-center justify-center gap-4 py-16"
      }
    >
      <div className={fullScreen ? "paper-sheet flex w-64 flex-col items-center gap-3 px-6 py-8" : "contents"}>
        <Mascot sprite={frame} size={120} />
        <p className="font-hand text-center text-2xl tracking-wide">{message}</p>
      </div>
    </div>
  );
}
