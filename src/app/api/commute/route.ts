import { CommuteRequestSchema } from "@/lib/types";
import { commuteBetween, toCommuteResponse } from "@/lib/maps/routes";
import { authorized, errorResponse } from "@/app/api/route-helpers";

export async function POST(request: Request): Promise<Response> {
  try {
    const { body } = await authorized(request, CommuteRequestSchema);
    const legs = await commuteBetween(body.origins, body.pins, body.mode);
    return Response.json(toCommuteResponse(legs));
  } catch (error) {
    return errorResponse(error, "Could not check the commute.");
  }
}
