import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/bookings/[bookingId]/route";
import { POST as respondToBooking } from "@/app/api/bookings/[bookingId]/respond/route";
import { POST as completeBooking } from "@/app/api/bookings/[bookingId]/complete/route";
import { confirmBookingPayment } from "@/lib/booking-confirm";
import { findBookingConflict } from "@/lib/booking-conflicts";
import { notifyUser } from "@/lib/notify";
import {
  canReachDatabase,
  resetTestData,
  seedBookingFixture,
  testPrisma,
} from "./helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

import { auth } from "@/auth";

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("booking lifecycle and isolation", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  it("advances PENDING_PROVIDER → PENDING_PAYMENT → CONFIRMED → COMPLETED", async () => {
    const fixture = await seedBookingFixture();

    vi.mocked(auth).mockResolvedValue({
      user: { id: fixture.caregiverUserId, email: "giver@test.com" },
    } as never);

    const acceptRes = await respondToBooking(
      new Request("http://localhost/api/bookings/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      { params: Promise.resolve({ bookingId: fixture.bookingId }) },
    );
    expect(acceptRes.status).toBe(200);
    expect((await acceptRes.json()).status).toBe("PENDING_PAYMENT");

    await testPrisma.payment.create({
      data: {
        bookingId: fixture.bookingId,
        mpesaPhone: "254712345678",
        status: "PENDING",
      },
    });

    const paymentResult = await confirmBookingPayment(fixture.bookingId, {
      resultCode: 0,
      raw: "{}",
    });
    expect(paymentResult.confirmed).toBe(true);

    const confirmed = await testPrisma.booking.findUnique({
      where: { id: fixture.bookingId },
      include: { payment: true, case: true },
    });
    expect(confirmed?.status).toBe("CONFIRMED");
    expect(confirmed?.payment?.status).toBe("SUCCESS");
    expect(confirmed?.case.status).toBe("BOOKED");

    vi.mocked(auth).mockResolvedValue({
      user: { id: fixture.patientId, email: "patient-a@test.com" },
    } as never);

    const completeRes = await completeBooking(
      new Request("http://localhost/api/bookings/x", { method: "POST" }),
      { params: Promise.resolve({ bookingId: fixture.bookingId }) },
    );
    expect(completeRes.status).toBe(200);

    const completed = await testPrisma.booking.findUnique({
      where: { id: fixture.bookingId },
      include: { case: true },
    });
    expect(completed?.status).toBe("COMPLETED");
    expect(completed?.case.status).toBe("COMPLETED");
  });

  it("treats duplicate payment confirmations as idempotent", async () => {
    const fixture = await seedBookingFixture();

    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "PENDING_PAYMENT" },
    });
    await testPrisma.payment.create({
      data: {
        bookingId: fixture.bookingId,
        mpesaPhone: "254712345678",
        checkoutRequestId: "ws_CO_TEST_123",
        status: "PENDING",
      },
    });

    const first = await confirmBookingPayment(fixture.bookingId, {
      resultCode: 0,
      raw: '{"first":true}',
    });
    expect(first).toEqual({ confirmed: true });

    const notifyCallsAfterFirst = vi.mocked(notifyUser).mock.calls.length;

    const second = await confirmBookingPayment(fixture.bookingId, {
      resultCode: 0,
      raw: '{"duplicate":true}',
    });
    expect(second).toEqual({ confirmed: true, alreadyProcessed: true });
    expect(vi.mocked(notifyUser).mock.calls.length).toBe(notifyCallsAfterFirst);
  });

  it("blocks overlapping bookings for the same caregiver", async () => {
    const fixture = await seedBookingFixture();

    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "CONFIRMED" },
    });

    const overlappingStart = new Date(
      fixture.scheduledAt.getTime() + 60 * 60_000,
    );
    const conflict = await findBookingConflict(
      fixture.caregiverId,
      overlappingStart,
      120,
    );

    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe(fixture.bookingId);
  });

  it("denies cross-tenant booking reads with 404", async () => {
    const fixture = await seedBookingFixture();

    vi.mocked(auth).mockResolvedValue({
      user: { id: fixture.otherPatientId, email: "patient-b@test.com" },
    } as never);

    const res = await GET(new Request("http://localhost/api/bookings/x"), {
      params: Promise.resolve({ bookingId: fixture.bookingId }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("allows the booking patient to read status", async () => {
    const fixture = await seedBookingFixture();

    vi.mocked(auth).mockResolvedValue({
      user: { id: fixture.patientId, email: "patient-a@test.com" },
    } as never);

    const res = await GET(new Request("http://localhost/api/bookings/x"), {
      params: Promise.resolve({ bookingId: fixture.bookingId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("PENDING_PROVIDER");
  });
});
