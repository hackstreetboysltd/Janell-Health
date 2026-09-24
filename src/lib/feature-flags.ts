/** When true, only APPROVED providers appear in patient search. */
export function verificationRequired(): boolean {
  return process.env.VERIFICATION_REQUIRED !== "false";
}

/** Demo email/name login — off in production unless explicitly allowed. */
export function devLoginEnabled(): boolean {
  if (process.env.ALLOW_DEV_LOGIN === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/** Phone OTP sign-in — opt-in via PHONE_OTP_ENABLED=true (Google is the default). */
export function phoneOtpEnabled(): boolean {
  return process.env.PHONE_OTP_ENABLED === "true";
}
