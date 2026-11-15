import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleChecklist, sampleInternationalProfile } from "@/lib/fixtures";

vi.mock("@/lib/firebase/client", () => ({
  isFirebaseConfigured: true,
  getIdToken: vi.fn(async () => "token"),
}));

import { fetchPlan } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPlan", () => {
  it("returns the parsed checklist and sends the bearer token", async () => {
    const fetchMock = vi.fn(async () => Response.json(sampleChecklist));
    vi.stubGlobal("fetch", fetchMock);

    const checklist = await fetchPlan(sampleInternationalProfile);

    expect(checklist.profileVersion).toBe(sampleChecklist.profileVersion);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: "Bearer token" });
  });

  it("throws an error that includes a 401 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Invalid bearer token." }, { status: 401 })),
    );

    await expect(fetchPlan(sampleInternationalProfile)).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining("HTTP 401"),
    });
  });
});
