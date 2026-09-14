import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createCase } from "@/app/api/cases/route";
import {
  API_RATE_LIMIT_POLICIES,
  enforceApiRateLimits,
} from "@/lib/api-rate-limit";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-rate-test" } }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
  }),
}));

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("API rate limiting", () => {
  beforeEach(async () => {
    vi.stubEnv("API_RATE_LIMIT_ENABLED", "true");
    await resetTestData();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 429 when global IP bucket is exhausted", async () => {
    const ip = "203.0.113.99";
    const policy = API_RATE_LIMIT_POLICIES.global;
    const bucket = `api:global:ip:${ip}`;

    for (let i = 0; i < policy.limit; i += 1) {
      await testPrisma.rateLimitHit.create({ data: { bucket } });
    }

    const req = new Request("http://localhost/api/complaints", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
    });

    const blocked = await enforceApiRateLimits(req);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 429 from case create when bookingCreate bucket is exhausted", async () => {
    const ip = "203.0.113.100";
    const userId = "user-rate-test";
    const policy = API_RATE_LIMIT_POLICIES.bookingCreate;

    for (let i = 0; i < policy.limit; i += 1) {
      await testPrisma.rateLimitHit.create({
        data: { bucket: `api:bookingCreate:user:${userId}` },
      });
    }

    const res = await createCase(
      new Request("http://localhost/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          category: "ELDERLY_CARE",
          ageBand: "ELDERLY",
          careSummary: "Needs daily assistance with mobility and meals.",
          visitAddress: "Nairobi CBD",
          visitPlaceId: "place-1",
          visitLat: -1.2864,
          visitLng: 36.8172,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 120,
          genderPreference: "NO_PREFERENCE",
        }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Too many requests. Try again later.",
    });
  });
});
