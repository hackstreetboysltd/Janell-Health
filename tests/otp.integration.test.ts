import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/otp";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("phone OTP rate limits", () => {
  const phone = "+254712345678";

  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  it("blocks more than five sends per hour for the same phone", async () => {
    const codeHash = await bcrypt.hash("123456", 10);
    const now = Date.now();

    for (let i = 0; i < 5; i += 1) {
      await testPrisma.phoneOtp.create({
        data: {
          phone,
          codeHash,
          expiresAt: new Date(now + 10 * 60_000),
          createdAt: new Date(now - i * 60_000),
        },
      });
    }

    const result = await sendPhoneOtp(phone);
    expect(result).toEqual({
      ok: false,
      error: "Too many codes sent. Try again in an hour.",
    });
  });

  it("enforces a resend cooldown on active codes", async () => {
    const codeHash = await bcrypt.hash("123456", 10);
    await testPrisma.phoneOtp.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const result = await sendPhoneOtp(phone);
    expect(result).toEqual({
      ok: false,
      error: "Wait a minute before requesting another code.",
    });
  });

  it("locks verification after too many failed attempts", async () => {
    const codeHash = await bcrypt.hash("123456", 10);
    await testPrisma.phoneOtp.create({
      data: {
        phone,
        codeHash,
        attempts: 5,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const result = await verifyPhoneOtp(phone, "000000");
    expect(result).toEqual({
      ok: false,
      error: "Too many attempts. Request a new code.",
    });
  });
});
