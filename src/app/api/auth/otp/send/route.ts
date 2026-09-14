import { NextResponse } from "next/server";
import { z } from "zod";
import { observeApiRequest } from "@/lib/api-observability";
import { clientIpFromRequest } from "@/lib/client-ip";
import { sendPhoneOtp } from "@/lib/otp";
import {
  consumeRateLimit,
  OTP_SEND_IP_LIMIT,
  OTP_SEND_IP_WINDOW_MS,
  otpSendIpBucket,
} from "@/lib/rate-limit";
import { normalizeKenyanPhone } from "@/lib/phone";
import { phoneOtpEnabled } from "@/lib/feature-flags";

const schema = z.object({
  phone: z.string().min(9).max(20),
});

export async function POST(req: Request) {
  return observeApiRequest(req, postHandler);
}

async function postHandler(req: Request) {
  if (!phoneOtpEnabled()) {
    return NextResponse.json({ error: "Phone login disabled" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "Use a Kenyan number (07XX or +254…)" },
      { status: 400 },
    );
  }

  const ipLimit = await consumeRateLimit({
    bucket: otpSendIpBucket(clientIpFromRequest(req)),
    limit: OTP_SEND_IP_LIMIT,
    windowMs: OTP_SEND_IP_WINDOW_MS,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests from your network. Try again later." },
      { status: 429 },
    );
  }

  const result = await sendPhoneOtp(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 429 });
  }

  return NextResponse.json({ ok: true, phone });
}
