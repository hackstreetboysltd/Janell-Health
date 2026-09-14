import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as sendOtp } from "@/app/api/auth/otp/send/route";
import {
  OTP_SEND_IP_LIMIT,
  OTP_SEND_IP_WINDOW_MS,
  consumeRateLimit,
  otpSendIpBucket,
} from "@/lib/rate-limit";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/feature-flags", () => ({
  phoneOtpEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("IP rate limiting", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  it("blocks after the configured number of hits in a window", async () => {
    const bucket = otpSendIpBucket("203.0.113.10");

    for (let i = 0; i < OTP_SEND_IP_LIMIT; i += 1) {
      const result = await consumeRateLimit({
        bucket,
        limit: OTP_SEND_IP_LIMIT,
        windowMs: OTP_SEND_IP_WINDOW_MS,
      });
      expect(result.ok).toBe(true);
    }

    const blocked = await consumeRateLimit({
      bucket,
      limit: OTP_SEND_IP_LIMIT,
      windowMs: OTP_SEND_IP_WINDOW_MS,
    });
    expect(blocked.ok).toBe(false);

    const rows = await testPrisma.rateLimitHit.count({ where: { bucket } });
    expect(rows).toBe(OTP_SEND_IP_LIMIT);
  });

  it("returns 429 from OTP send route when IP bucket is exhausted", async () => {
    const ip = "203.0.113.55";
    const bucket = otpSendIpBucket(ip);

    for (let i = 0; i < OTP_SEND_IP_LIMIT; i += 1) {
      await testPrisma.rateLimitHit.create({ data: { bucket } });
    }

    const res = await sendOtp(
      new Request("http://localhost/api/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({ phone: "0712345678" }),
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Too many requests from your network. Try again later.",
    });
  });
});
