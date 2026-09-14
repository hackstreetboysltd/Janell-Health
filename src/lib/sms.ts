import { logger } from "@/lib/logger";

type SendSmsResult = { sent: boolean; stub: boolean; provider?: string };

function normalizeSmsPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `+254${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

async function sendViaAfricasTalking(
  phone: string,
  message: string,
  sender: string,
): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_API_KEY?.trim();
  const username = process.env.AT_USERNAME?.trim();
  if (!apiKey || !username) {
    logger.warn("sms.misconfigured", { reason: "missing_api_key_or_username" });
    return { sent: false, stub: true };
  }

  const base =
    process.env.AT_ENV === "production"
      ? "https://api.africastalking.com"
      : "https://api.sandbox.africastalking.com";

  const body = new URLSearchParams({
    username,
    to: normalizeSmsPhone(phone),
    message,
  });
  if (sender) body.set("from", sender);

  const res = await fetch(`${base}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Recipients?: Array<{ status?: string }> };
  };

  if (!res.ok) {
    logger.error("sms.send_failed", {
      status: res.status,
      provider: "africastalking",
    });
    return { sent: false, stub: false, provider: "africastalking" };
  }

  const recipientStatus = data.SMSMessageData?.Recipients?.[0]?.status;
  const sent = recipientStatus === "Success" || recipientStatus === "Submitted";
  logger.info("sms.sent", {
    provider: "africastalking",
    sent,
    status: recipientStatus,
  });
  return { sent, stub: false, provider: "africastalking" };
}

export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const normalized = normalizeSmsPhone(phone);
  if (process.env.SMS_ENABLED !== "true") {
    logger.info("sms.stub", { to: normalized, len: message.length });
    return { sent: false, stub: true };
  }

  const sender = process.env.SMS_SENDER_ID?.trim() ?? "JanellHlth";
  const provider = process.env.SMS_PROVIDER?.trim() || "africastalking";

  if (provider === "africastalking") {
    return sendViaAfricasTalking(normalized, message, sender);
  }

  logger.warn("sms.unknown_provider", { provider });
  return { sent: false, stub: true };
}
