import { PlacesRequestSchema } from "@/lib/types";
import { searchText } from "@/lib/maps/places";
import { authorized, errorResponse } from "@/app/api/route-helpers";

export async function POST(request: Request): Promise<Response> {
  try {
    const { body } = await authorized(request, PlacesRequestSchema);
    const places = await searchText({
      query: body.query,
      near: body.near,
      radiusM: body.radiusM,
      pageSize: 8,
    });
    return Response.json({ places });
  } catch (error) {
    return errorResponse(error, "Could not search places.");
  }
}
