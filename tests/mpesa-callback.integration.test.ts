import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as mpesaCallback } from "@/app/api/mpesa/callback/route";
import { notifyUser } from "@/lib/notify";
import {
  canReachDatabase,
  resetTestData,
  seedBookingFixture,
  testPrisma,
} from "./helpers/db";

vi.mock("@/lib/notify", () => ({
  notifyUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

function stkCallbackBody(checkoutRequestId: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "mr_test",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "Success",
      },
    },
  };
}

describeIntegration("M-Pesa callback idempotency", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts duplicate callbacks without duplicate side effects", async () => {
    const fixture = await seedBookingFixture();
    const checkoutRequestId = "ws_CO_CALLBACK_TEST";

    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "PENDING_PAYMENT" },
    });
    await testPrisma.payment.create({
      data: {
        bookingId: fixture.bookingId,
        mpesaPhone: "254712345678",
        checkoutRequestId,
        status: "PENDING",
      },
    });

    const first = await mpesaCallback(
      new Request("http://localhost/api/mpesa/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stkCallbackBody(checkoutRequestId)),
      }),
    );
    expect(first.status).toBe(200);

    const notifyCallsAfterFirst = vi.mocked(notifyUser).mock.calls.length;

    const second = await mpesaCallback(
      new Request("http://localhost/api/mpesa/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stkCallbackBody(checkoutRequestId)),
      }),
    );
    expect(second.status).toBe(200);
    expect(vi.mocked(notifyUser).mock.calls.length).toBe(notifyCallsAfterFirst);

    const booking = await testPrisma.booking.findUnique({
      where: { id: fixture.bookingId },
      include: { payment: true },
    });
    expect(booking?.status).toBe("CONFIRMED");
    expect(booking?.payment?.status).toBe("SUCCESS");
  });

  it("rejects callbacks without a valid token in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "s3cret");

    const res = await mpesaCallback(
      new Request("https://app.example/api/mpesa/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stkCallbackBody("ws_CO_FORBIDDEN")),
      }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });
});
