export type MpesaEnvironment = "sandbox" | "production";

const MPESA_API_HOST: Record<MpesaEnvironment, string> = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

/** Daraja environment — default sandbox. Set `MPESA_ENV=production` for live STK. */
export function mpesaEnvironment(): MpesaEnvironment {
  return process.env.MPESA_ENV === "production" ? "production" : "sandbox";
}

export function mpesaApiBaseUrl(env: MpesaEnvironment = mpesaEnvironment()): string {
  return MPESA_API_HOST[env];
}

export function mpesaOAuthUrl(env: MpesaEnvironment = mpesaEnvironment()): string {
  return `${mpesaApiBaseUrl(env)}/oauth/v1/generate?grant_type=client_credentials`;
}

export function mpesaStkPushUrl(env: MpesaEnvironment = mpesaEnvironment()): string {
  return `${mpesaApiBaseUrl(env)}/mpesa/stkpush/v1/processrequest`;
}

/**
 * Local mock STK flow — never enabled in production unless
 * `ALLOW_MPESA_MOCK=true` is explicitly set.
 */
export function mpesaMockEnabled(): boolean {
  if (process.env.MPESA_MOCK !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    return process.env.ALLOW_MPESA_MOCK === "true";
  }
  return true;
}

/**
 * Validates Safaricom callback requests when `MPESA_CALLBACK_SECRET` is set.
 * Register Daraja CallBackURL as `/api/mpesa/callback?token=<secret>`.
 * In production the secret is required.
 */
export function isValidMpesaCallback(req: Request): boolean {
  const secret = process.env.MPESA_CALLBACK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const url = new URL(req.url);
  return url.searchParams.get("token") === secret;
}
