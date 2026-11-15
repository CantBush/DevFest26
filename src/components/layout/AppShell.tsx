import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon, GearIcon, HomeIcon } from "@/components/Icons";

// Phone-width frame from the sketch: back button and actions on top, Home button
// bottom-center, settings gear bottom-right on the home screen.
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper shadow-sm">
      {(title || backHref || actions) && (
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-line bg-paper/95 px-3 backdrop-blur">
          {backHref && (
            <Link
              href={backHref}
              className="-ml-1 flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold hover:bg-wash"
            >
              <BackIcon size={20} />
              {backLabel}
            </Link>
          )}
          <div className="min-w-0 flex-1 truncate text-lg font-bold">{title}</div>
          {actions}
        </header>
      )}

      <main className={`flex flex-1 flex-col px-4 py-4 ${hasBottomBar ? "pb-24" : ""}`}>{children}</main>

      {hasBottomBar && (
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-16 w-full max-w-md items-center justify-center border-t border-line bg-paper/95 backdrop-blur">
          {showHome && (
            <Link
              href="/home"
              aria-label="Home checklist"
              className="sketch-border flex h-11 w-11 items-center justify-center bg-paper hover:bg-wash"
            >
              <HomeIcon />
            </Link>
          )}
          {showSettings && (
            <Link
              href="/settings"
              aria-label="Settings"
              className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full hover:bg-wash"
            >
              <GearIcon />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
