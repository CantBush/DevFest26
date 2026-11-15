"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "./AppState";

// Sends people without a finished quiz to onboarding.
export function useRequireProfile() {
  const app = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (app.ready && !app.profile) router.replace("/onboarding");
  }, [app.ready, app.profile, router]);

  return app;
}
