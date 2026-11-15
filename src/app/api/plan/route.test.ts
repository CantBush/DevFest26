import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleDomesticProfile, sampleInternationalProfile } from "@/lib/fixtures";

vi.mock("@/lib/firebase/admin", () => {
  class AuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthError";
    }
  }
  return {
    AuthError,
    requireUid: vi.fn(),
    adminApp: vi.fn(),
  };
});

vi.mock("@/lib/firebase/store", () => ({
  consumeRegeneration: vi.fn(),
  loadReusableFactPack: vi.fn(),
  cachePlan: vi.fn(),
}));

vi.mock("@/lib/gemini/plan", () => ({
  createPlan: vi.fn(),
}));

import { requireUid } from "@/lib/firebase/admin";
import { consumeRegeneration, loadReusableFactPack, cachePlan } from "@/lib/firebase/store";
import { createPlan } from "@/lib/gemini/plan";
import { POST } from "@/app/api/plan/route";

const requireUidMock = vi.mocked(requireUid);
const capMock = vi.mocked(consumeRegeneration);
const factPackMock = vi.mocked(loadReusableFactPack);
const cacheMock = vi.mocked(cachePlan);
const createPlanMock = vi.mocked(createPlan);

const quizProfile = { ...sampleDomesticProfile, moveDate: "2027-09-01" };

function request(body: unknown, token = "token"): Request {
  return new Request("http://localhost/api/plan", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a missing token", async () => {
    const { AuthError } = await import("@/lib/firebase/admin");
    requireUidMock.mockRejectedValue(new AuthError("Missing bearer token."));
    const response = await POST(request({ profile: sampleDomesticProfile }));
    expect(response.status).toBe(401);
    expect(createPlanMock).not.toHaveBeenCalled();
  });

  it("rejects a body that is not a profile", async () => {
    requireUidMock.mockResolvedValue("user-1");
    const response = await POST(request({ profile: { scope: "domestic" } }));
    expect(response.status).toBe(400);
  });

  it("returns the template without Gemini when the regeneration cap is hit", async () => {
    requireUidMock.mockResolvedValue("user-1");
    capMock.mockResolvedValue("capped");
    const response = await POST(request({ profile: { ...quizProfile, version: 4 } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Plan-Source")).toBe("cap");
    const body = (await response.json()) as { sections: { id: string }[] };
    expect(body.sections.some((section) => section.id === "visa")).toBe(false);
    expect(createPlanMock).not.toHaveBeenCalled();
  });

  it("reuses a stored fact pack and caches the checklist", async () => {
    requireUidMock.mockResolvedValue("user-1");
    capMock.mockResolvedValue("ok");
    factPackMock.mockResolvedValue(undefined);
    createPlanMock.mockResolvedValue({
      profileVersion: 1,
      generatedAt: "2026-11-14T12:00:00.000Z",
      sections: [],
    });
    const response = await POST(request({ profile: quizProfile }));
    expect(response.status).toBe(200);
    expect(createPlanMock).toHaveBeenCalledWith(quizProfile, { previousFactPack: undefined });
    expect(cacheMock).toHaveBeenCalledOnce();
  });

  it("returns the saved plan for a demo account without Gemini", async () => {
    requireUidMock.mockResolvedValue("user-1");
    const response = await POST(request({ profile: sampleInternationalProfile }));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Plan-Source")).toBe("demo");
    const body = (await response.json()) as { sections: { id: string }[] };
    expect(body.sections.some((section) => section.id === "visa")).toBe(true);
    expect(createPlanMock).not.toHaveBeenCalled();
    expect(capMock).not.toHaveBeenCalled();
  });
});
