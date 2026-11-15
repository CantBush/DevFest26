"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { useAppState } from "@/components/state/AppState";

export default function RootPage() {
  const { ready, profile } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (ready) router.replace(profile ? "/home" : "/onboarding");
  }, [ready, profile, router]);

  return <LoadingMascot fullScreen messages={["Opening the boxes..."]} />;
}
