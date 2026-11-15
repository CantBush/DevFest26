import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon, GearIcon, HomeIcon } from "@/components/Icons";

function BoardClip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 52"
      className="pointer-events-none absolute -top-6 left-1/2 z-30 h-[52px] w-[160px] -translate-x-1/2"
    >
      <defs>
        <linearGradient id="clip-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e9e7" />
          <stop offset="0.55" stopColor="#c4c4c0" />
          <stop offset="1" stopColor="#9d9d98" />
        </linearGradient>
      </defs>
      <rect x="34" y="2" width="92" height="18" rx="5" fill="url(#clip-metal)" stroke="#7d7d78" />
      <circle cx="48" cy="11" r="4" fill="#d9d9d6" stroke="#7d7d78" />
      <circle cx="112" cy="11" r="4" fill="#d9d9d6" stroke="#7d7d78" />
      <path d="M22 50 L32 18 H128 L138 50 Z" fill="url(#clip-metal)" stroke="#7d7d78" />
      <path d="M36 24 H124" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
    </svg>
  );
}

// A sheet of paper clipped to a kraft board: back button and actions on top,
// Home button bottom-center, settings gear bottom-right on the home screen.
export function AppShell({
  children,
  title,
  backHref,
  backLabel = "Back",
  actions,
  showHome = true,
  showSettings = false,
}: {
  children: ReactNode;
  title?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  showHome?: boolean;
  showSettings?: boolean;
}) {
  const hasBottomBar = showHome || showSettings;

  return (
    <div className="min-h-dvh px-2 pt-8 pb-2 sm:px-4 sm:pt-12">
      <div className="paper-sheet relative mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col sm:min-h-[calc(100dvh-4rem)]">
        <BoardClip />
        <div className="h-7 shrink-0" />
        {(title || backHref || actions) && (
          <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 rounded-t-md bg-paper/95 px-3 backdrop-blur">
            {backHref && (
              <Link
                href={backHref}
                className="-ml-1 flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold hover:bg-wash"
              >
                <BackIcon size={20} />
                {backLabel}
              </Link>
            )}
            <div className="font-hand min-w-0 flex-1 truncate text-2xl">{title}</div>
            {actions}
          </header>
        )}

        <main className={`flex flex-1 flex-col px-5 pt-2 pb-6 ${hasBottomBar ? "pb-28" : ""}`}>{children}</main>
      </div>

      {hasBottomBar && (
        <nav className="fixed inset-x-0 bottom-0 z-20 px-2 sm:px-4">
          <div className="relative mx-auto flex h-20 w-full max-w-md items-center justify-center border-t-2 border-dashed border-line bg-paper/95 backdrop-blur">
            {showHome && (
              <Link href="/home" aria-label="Home checklist" className="btn btn-plain h-13 w-13 p-0">
                <HomeIcon />
              </Link>
            )}
            {showSettings && (
              <Link
                href="/settings"
                aria-label="Settings"
                className="absolute right-5 flex h-12 w-12 items-center justify-center rounded-full hover:bg-wash"
              >
                <GearIcon size={26} />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
