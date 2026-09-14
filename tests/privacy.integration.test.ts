import { describe, expect, it, vi, afterEach } from "vitest";
import { BLOCKING_BOOKING_STATUSES, getErasureBlockers } from "@/lib/privacy";

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

import {
  canReachDatabase,
  resetTestData,
  seedBookingFixture,
  testPrisma,
} from "./helpers/db";

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("privacy erasure", () => {
  afterEach(async () => {
    await resetTestData();
  });

  it("allows erasure when user has no active bookings", async () => {
    const fixture = await seedBookingFixture();
    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "COMPLETED" },
    });
    await testPrisma.case.update({
      where: { id: fixture.caseId },
      data: { status: "COMPLETED" },
    });

    const blocker = await getErasureBlockers(fixture.patientId);
    expect(blocker).toBeNull();
  });

  it("blocks erasure while patient has a confirmed booking", async () => {
    const fixture = await seedBookingFixture();
    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "CONFIRMED" },
    });

    const blocker = await getErasureBlockers(fixture.patientId);
    expect(blocker).toEqual({ code: "ACTIVE_BOOKINGS", count: 1 });
  });
});

describe("blocking booking statuses", () => {
  it("includes in-flight visit states", () => {
    expect(BLOCKING_BOOKING_STATUSES).toContain("PENDING_PROVIDER");
    expect(BLOCKING_BOOKING_STATUSES).toContain("PENDING_PAYMENT");
    expect(BLOCKING_BOOKING_STATUSES).toContain("CONFIRMED");
  });
});
