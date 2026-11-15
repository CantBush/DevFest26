import { Suspense } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { SectionScreen } from "@/components/screens/SectionScreen";

// The section id is only known at request time, so the screen that reads it
// renders inside Suspense (required with Cache Components).
export default function SectionPage() {
  return (
    <Suspense fallback={<LoadingMascot fullScreen />}>
      <SectionScreen />
    </Suspense>
  );
}
