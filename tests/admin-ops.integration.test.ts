import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/ops/route";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

import { auth } from "@/auth";

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("GET /api/admin/ops", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 for non-admin users", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `patient-${Date.now()}@carelink.test`,
        name: "Patient",
        role: "PATIENT",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: user.id, email: user.email },
    } as never);

    const res = await GET(new Request("http://localhost/api/admin/ops"));
    expect(res.status).toBe(403);
  });

  it("returns funnel and red metrics for admins", async () => {
    const admin = await testPrisma.user.create({
      data: {
        email: `ops-${Date.now()}@carelink.test`,
        name: "Ops",
        role: "ADMIN",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: admin.id, email: admin.email, role: "ADMIN" },
    } as never);

    const res = await GET(new Request("http://localhost/api/admin/ops"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.funnel).toMatchObject({
      pendingProvider: expect.any(Number),
      paymentsFailed: expect.any(Number),
    });
    expect(body.red).toMatchObject({
      requests: expect.any(Number),
      latencyMs: expect.objectContaining({ p50: expect.any(Number) }),
    });
    expect(body.launch).toMatchObject({
      bookingsThisWeek: expect.any(Number),
    });
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});
