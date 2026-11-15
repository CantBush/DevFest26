import { PlanRequestSchema } from "@/lib/types";
import { buildChecklist } from "@/lib/checklist/build";
import { createPlan } from "@/lib/gemini/plan";
import { cachePlan, consumeRegeneration, loadReusableFactPack } from "@/lib/firebase/store";
import { authorized, errorResponse } from "@/app/api/route-helpers";

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const { uid, body } = await authorized(request, PlanRequestSchema);
    const cap = await consumeRegeneration(uid, body.profile.version);
    if (cap === "capped") {
      return Response.json(buildChecklist(body.profile), { headers: { "X-Plan-Source": "cap" } });
    }
    const previousFactPack = await loadReusableFactPack(uid, body.profile);
    const checklist = await createPlan(body.profile, { previousFactPack });
    await cachePlan(uid, checklist);
    return Response.json(checklist);
  } catch (error) {
    return errorResponse(error, "Could not build the checklist.");
  }
}
