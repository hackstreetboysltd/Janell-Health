import {
  mpesaMockEnabled,
  mpesaOAuthUrl,
  mpesaStkPushUrl,
} from "@/lib/mpesa-config";

function normalizeMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  throw new Error("Enter a valid Kenyan mobile number");
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials missing");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(mpesaOAuthUrl(), {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Failed to get M-Pesa token");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export type StkResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  mock?: boolean;
};

export async function initiateStkPush(opts: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}): Promise<StkResult> {
  const phone = normalizeMsisdn(opts.phone);

  if (mpesaMockEnabled()) {
    return {
      checkoutRequestId: `ws_CO_MOCK_${Date.now()}`,
      merchantRequestId: `mock-merchant-${Date.now()}`,
      mock: true,
    };
  }

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("M-Pesa shortcode, passkey, and callback URL are required");
  }

  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const token = await getAccessToken();

  const res = await fetch(mpesaStkPushUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, Math.round(opts.amount)),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: opts.accountReference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });

  const data = (await res.json()) as {
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    errorMessage?: string;
    ResponseDescription?: string;
  };

  if (!data.CheckoutRequestID) {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push failed");
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID || "",
  };
}

export { normalizeMsisdn };
