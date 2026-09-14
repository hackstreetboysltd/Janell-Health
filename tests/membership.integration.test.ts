import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as membershipUpgrade } from "@/app/api/giver/membership/route";
import { MEMBERSHIP_PLANS } from "@/lib/membership";
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

describeIntegration("membership billing idempotency", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
    vi.stubEnv("MPESA_MOCK", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not double-extend membership for duplicate idempotency keys", async () => {
    const giver = await testPrisma.user.create({
      data: {
        email: `giver-${Date.now()}@carelink.test`,
        name: "Care Giver",
        role: "CAREGIVER",
      },
    });
    const profile = await testPrisma.caregiverProfile.create({
      data: {
        userId: giver.id,
        fullName: "Jane Nurse",
        nationalId: "12345678",
        profession: "NURSE",
        professionId: "NCK-TEST",
        region: "westlands",
        address: "Westlands, Nairobi",
        lat: -1.267,
        lng: 36.81,
        rateType: "VISIT",
        rateKes: 5000,
        availableWeekdaysStart: "08:00",
        availableWeekdaysEnd: "18:00",
        availableWeekendsStart: "09:00",
        availableWeekendsEnd: "14:00",
        verificationStatus: "APPROVED",
        isActive: true,
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: giver.id, email: giver.email },
    } as never);

    const body = {
      plan: "professional" as const,
      idempotencyKey: "membership-idem-key-001",
    };

    const first = await membershipUpgrade(
      new Request("http://localhost/api/giver/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, plan: "professional" });

    const afterFirst = await testPrisma.caregiverProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    const firstUntil = afterFirst.membershipUntil;
    expect(firstUntil).not.toBeNull();

    const second = await membershipUpgrade(
      new Request("http://localhost/api/giver/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      ok: true,
      plan: "professional",
      alreadyProcessed: true,
    });

    const afterSecond = await testPrisma.caregiverProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    expect(afterSecond.membershipUntil?.getTime()).toBe(firstUntil!.getTime());
    expect(afterSecond.membershipTier).toBe("PROFESSIONAL");

    const purchaseCount = await testPrisma.membershipPurchase.count({
      where: { caregiverId: profile.id },
    });
    expect(purchaseCount).toBe(1);

    const daysAdded =
      (firstUntil!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysAdded).toBeGreaterThan(MEMBERSHIP_PLANS.professional.days - 1);
    expect(daysAdded).toBeLessThan(MEMBERSHIP_PLANS.professional.days + 1);
  });
});
