import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as stkPush } from "@/app/api/mpesa/stk/route";
import {
  canReachDatabase,
  resetTestData,
  seedBookingFixture,
  testPrisma,
} from "./helpers/db";

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

describeIntegration("M-Pesa STK push route", () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("MPESA_MOCK", "false");
    vi.stubEnv("MPESA_CONSUMER_KEY", "test-consumer-key");
    vi.stubEnv("MPESA_CONSUMER_SECRET", "test-consumer-secret");
    vi.stubEnv("MPESA_SHORTCODE", "174379");
    vi.stubEnv("MPESA_PASSKEY", "test-passkey");
    vi.stubEnv("MPESA_CALLBACK_URL", "https://app.example/api/mpesa/callback");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("initiates STK push via Daraja and upserts a pending payment", async () => {
    const fixture = await seedBookingFixture();
    await testPrisma.booking.update({
      where: { id: fixture.bookingId },
      data: { status: "PENDING_PAYMENT" },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: fixture.patientId, email: "patient-a@test.com" },
    } as never);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "daraja-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CheckoutRequestID: "ws_CO_DARAJA_TEST",
          MerchantRequestID: "mr_daraja_test",
          ResponseDescription: "Success. Request accepted for processing",
        }),
      });

    const res = await stkPush(
      new Request("http://localhost/api/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: fixture.bookingId,
          phone: "0712345678",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      mock: false,
      checkoutRequestId: "ws_CO_DARAJA_TEST",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [oauthUrl, oauthInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(oauthUrl).toContain("/oauth/v1/generate");
    expect(oauthInit.headers).toMatchObject({
      Authorization: expect.stringContaining("Basic "),
    });

    const [stkUrl, stkInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(stkUrl).toContain("/mpesa/stkpush/v1/processrequest");
    expect(stkInit.method).toBe("POST");
    expect(stkInit.headers).toMatchObject({
      Authorization: "Bearer daraja-token",
    });
    const stkBody = JSON.parse(String(stkInit.body));
    expect(stkBody.PhoneNumber).toBe("254712345678");
    expect(stkBody.Amount).toBe(5000);
    expect(stkBody.CallBackURL).toBe("https://app.example/api/mpesa/callback");

    const payment = await testPrisma.payment.findUnique({
      where: { bookingId: fixture.bookingId },
    });
    expect(payment?.status).toBe("PENDING");
    expect(payment?.checkoutRequestId).toBe("ws_CO_DARAJA_TEST");
    expect(payment?.merchantRequestId).toBe("mr_daraja_test");
    expect(payment?.mpesaPhone).toBe("0712345678");
  });
});
