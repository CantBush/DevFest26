import { TaskDetailRequestSchema } from "@/lib/types";
import { hashInputs } from "@/lib/checklist/hash";
import { dependsOnFor } from "@/lib/checklist/template";
import { UnknownTaskError, createTaskDetail } from "@/lib/gemini/task-detail";
import { cacheTaskDetail, cachedTaskDetail } from "@/lib/firebase/store";
import { demoFixturesEnabled } from "@/lib/gemini/demo";
import { authorized, errorResponse } from "@/app/api/route-helpers";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const { uid, body } = await authorized(request, TaskDetailRequestSchema);
    const inputsHash = hashInputs(body.profile, dependsOnFor(body.taskId));
    if (!demoFixturesEnabled()) {
      const cached = await cachedTaskDetail(uid, body.taskId, inputsHash);
      if (cached) return Response.json(cached, { headers: { "X-Task-Detail-Source": "cache" } });
    }
    const detail = await createTaskDetail({ profile: body.profile, taskId: body.taskId, factPack: body.factPack });
    await cacheTaskDetail(uid, detail);
    return Response.json(detail);
  } catch (error) {
    if (error instanceof UnknownTaskError) return Response.json({ error: error.message }, { status: 404 });
    return errorResponse(error, "Could not build the task page.");
  }
}
