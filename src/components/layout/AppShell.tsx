"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BackIcon, ClipboardIcon, GearIcon } from "@/components/Icons";
import { useAppState } from "@/components/state/AppState";

// Drawn like the sprites: flat fills with the same ink outline weight.
function BoardClip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 56"
      fill="none"
      stroke="#1f1c19"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute -top-6 left-1/2 z-30 h-[56px] w-[160px] -translate-x-1/2"
    >
      <path d="M20 6 Q20 3 23 3 H46 Q49 3 49 6 V19 Q49 22 46 22 H23 Q20 22 20 19 Z" fill="#cfcfcb" strokeWidth="2.4" />
      <path d="M111 6 Q111 3 114 3 H137 Q140 3 140 6 V19 Q140 22 137 22 H114 Q111 22 111 19 Z" fill="#cfcfcb" strokeWidth="2.4" />
      <circle cx="31" cy="12.5" r="4.5" fill="#ededeb" strokeWidth="2" />
      <circle cx="129" cy="12.5" r="4.5" fill="#ededeb" strokeWidth="2" />
      <path d="M28.6 12.5 h4.8 M126.6 12.5 h4.8" strokeWidth="1.6" />
      <path d="M47 8 Q48 5 52 5 H108 Q112 5 113 8 L127 46 Q128.5 51 123 51 H37 Q31.5 51 33 46 Z" fill="#dcdcd8" strokeWidth="2.4" />
      <path d="M54 13 H106" stroke="#fff" strokeWidth="3.5" />
      <path d="M45 41 l2.5 -7" stroke="#fff" strokeWidth="3" />
      <path d="M40 44.5 H120" strokeOpacity="0.25" strokeWidth="1.6" />
    </svg>
  );
}

// A sheet of paper clipped to a kraft board: back button and actions on top,
// settings bottom-left and the clipboard (home) button bottom-center.
export function AppShell({
  children,
  title,
  backHref,
  backLabel = "Back",
  actions,
  showHome = true,
  showSettings = true,
}: {
  children: ReactNode;
  title?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  showHome?: boolean;
  showSettings?: boolean;
}) {
  const { profile } = useAppState();
  const pathname = usePathname();
  // Settings needs saved answers, so it stays hidden during onboarding.
  const settingsVisible = showSettings && Boolean(profile);
  const onSettings = pathname.startsWith("/settings");
  const hasBottomBar = showHome || settingsVisible;

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
            {settingsVisible && (
              <Link
                href="/settings"
                aria-label="Settings"
                aria-current={onSettings ? "page" : undefined}
                className={`absolute left-5 flex h-12 w-12 items-center justify-center rounded-full hover:bg-wash ${
                  onSettings ? "bg-wash" : ""
                }`}
              >
                <GearIcon size={26} />
              </Link>
            )}
            {showHome && (
              <Link href="/home" aria-label="Home checklist" className="btn btn-plain h-13 w-13 p-0">
                <ClipboardIcon size={32} />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
