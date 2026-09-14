import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendPhoneOtp(phone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.phoneOtp.count({
    where: { phone, createdAt: { gte: hourAgo } },
  });
  if (recentCount >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "Too many codes sent. Try again in an hour." };
  }

  const latest = await prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return { ok: false, error: "Wait a minute before requesting another code." };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.phoneOtp.create({
    data: {
      phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendSms(
    phone,
    `Your Janell Health verification code is ${code}. Valid for 10 minutes. Do not share it.`,
  );

  return { ok: true };
}

export async function verifyPhoneOtp(
  phone: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const challenge = await prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, error: "No active code. Request a new one." };
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    await prisma.phoneOtp.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.phoneOtp.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
