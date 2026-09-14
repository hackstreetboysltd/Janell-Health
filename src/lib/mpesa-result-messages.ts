/**
 * User-facing copy for Safaricom Daraja STK callback result codes.
 * @see https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 */
const KNOWN_CODES: Record<number, string> = {
  0: "Payment received.",
  1: "Insufficient M-Pesa balance. Top up and try again.",
  1032: "You cancelled the prompt on your phone.",
  1037: "The M-Pesa prompt timed out. Approve within 60 seconds.",
  2001: "Wrong M-Pesa PIN. Check your PIN and try again.",
  2019: "Too many wrong PIN attempts. Wait a few minutes, then try again.",
};

/** Map a Daraja result code to plain-language guidance for patients. */
export function mpesaResultMessage(
  resultCode: number | null | undefined,
  fallback = "Payment failed or was cancelled on your phone.",
): string {
  if (resultCode == null) return fallback;
  return KNOWN_CODES[resultCode] ?? fallback;
}
