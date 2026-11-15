import { Suspense } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { TaskScreen } from "@/components/screens/TaskScreen";

// The task id is only known at request time, so the screen that reads it
// renders inside Suspense (required with Cache Components).
export default function TaskPage() {
  return (
    <Suspense fallback={<LoadingMascot fullScreen />}>
      <TaskScreen />
    </Suspense>
  );
}
