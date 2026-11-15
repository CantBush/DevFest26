"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingMascot } from "@/components/LoadingMascot";
import { AppShell } from "@/components/layout/AppShell";
import { BookmarkButton, Checkbox } from "@/components/checklist/parts";
import { BlockRenderer } from "@/components/detail/BlockRenderer";
import { LocationSearch } from "@/components/detail/LocationSearch";
import { MapView, type MapPoint } from "@/components/detail/MapView";
import { findTask, sectionHref, taskHref } from "@/components/state/AppState";
import { useRequireProfile } from "@/components/state/useRequireProfile";
import type { PlacesResponse, Profile, Task, TaskDetail } from "@/lib/types";

const VERIFY_TASK_IDS = new Set(["paperwork.taxes", "paperwork.insurance", "health.coverage"]);

function needsVerifyNote(task: Task) {
  return task.detailKind === "factPack" || VERIFY_TASK_IDS.has(task.id);
}

function mapPoints(detail: TaskDetail, profile: Profile, searched: PlacesResponse["places"]): MapPoint[] {
  const points: MapPoint[] = [];
  if (detail.location) points.push({ id: "location", kind: "home", ...detail.location });
  for (const pin of profile.pins) {
    points.push({ id: pin.id, kind: "pin", label: pin.label, lat: pin.place.lat, lng: pin.place.lng });
  }
  for (const [id, place] of Object.entries(detail.places)) {
    points.push({ id, kind: "place", label: place.name, lat: place.lat, lng: place.lng });
  }
  for (const place of searched) {
    points.push({ id: `search-${place.placeId}`, kind: "place", label: place.name, lat: place.lat, lng: place.lng });
  }
  return points;
}

export function TaskScreen() {
  const params = useParams<{ taskId: string }>();
  const taskId = decodeURIComponent(params.taskId);
  const app = useRequireProfile();
  const { checklist, taskDetails, loadTaskDetail } = app;
  const found = useMemo(() => findTask(checklist, taskId), [checklist, taskId]);
  const detail = taskDetails[taskId];
  const requested = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [searched, setSearched] = useState<PlacesResponse["places"]>([]);

  useEffect(() => {
    if (!found || detail || requested.current === found.task.id) return;
    requested.current = found.task.id;
    loadTaskDetail(found.task).catch(() => setFailed(true));
  }, [found, detail, loadTaskDetail]);

  if (!app.ready || !app.profile) return <LoadingMascot fullScreen />;

  if (!found) {
    return (
      <AppShell backHref="/home" title="Not found">
        <p className="text-muted">This task isn&apos;t in your plan anymore.</p>
        <Link href="/home" className="mt-4 font-bold underline">
          Back to your checklist
        </Link>
      </AppShell>
    );
  }

  const { task, section } = found;
  const done = Boolean(app.progress[task.id]);

  return (
    <AppShell
      backHref={sectionHref(section.id)}
      backLabel={section.title}
      actions={
        <BookmarkButton id={`task:${task.id}`} href={taskHref(task.id)} title={task.title} sprite={task.sprite ?? section.sprite} />
      }
    >
      <div
        className={`sketch-border mb-5 flex items-center gap-3 px-3 py-1 ${done ? "bg-accent-soft" : "bg-wash"}`}
      >
        <Checkbox checked={done} onChange={(v) => app.setTaskDone(task.id, v)} label={`Mark "${task.title}" done`} />
        <span className="font-hand text-2xl tracking-wide">{done ? "Done! Nice work" : "Mark as done"}</span>
      </div>

      {failed && <p className="font-semibold text-warn">Couldn&apos;t load this page. Try again in a moment.</p>}
      {!detail && !failed && <LoadingMascot messages={["Researching this task...", "Checking nearby places..."]} />}

      {detail && (
        <div className="flex flex-col gap-5">
          {detail.location && task.detailKind !== "packingList" && (
            <LocationSearch location={detail.location} onResults={setSearched} />
          )}
          <BlockRenderer detail={detail} profile={app.profile} />
          {task.detailKind !== "packingList" && <MapView points={mapPoints(detail, app.profile, searched)} />}

          {detail.sources && detail.sources.length > 0 && (
            <div>
              <p className="text-sm font-bold">Sources</p>
              <ul className="text-sm">
                {detail.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {needsVerifyNote(task) && (
            <p className="text-xs font-semibold text-muted">AI-generated. Verify with the official source before acting.</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
