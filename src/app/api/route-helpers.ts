import { z } from "zod";
import { AuthError, requireUid } from "@/lib/firebase/admin";

export class BadRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequest";
  }
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequest("Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequest("Request body does not match the expected shape.");
  return parsed.data;
}

export async function authorized<T>(request: Request, schema: z.ZodType<T>): Promise<{ uid: string; body: T }> {
  const uid = await requireUid(request);
  const body = await readJson(request, schema);
  return { uid, body };
}

export function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof BadRequest) return Response.json({ error: error.message }, { status: 400 });
  console.error(fallback, error instanceof Error ? error.message : "Unknown error");
  return Response.json({ error: fallback }, { status: 500 });
}
