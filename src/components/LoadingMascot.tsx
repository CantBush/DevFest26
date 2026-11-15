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
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-wash/95"
          : "flex flex-col items-center justify-center gap-4 py-16"
      }
    >
      <Mascot sprite={frame} size={112} />
      <p className="text-base font-semibold text-muted">{message}</p>
    </div>
  );
}
