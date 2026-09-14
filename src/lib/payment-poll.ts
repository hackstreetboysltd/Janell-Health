import { mpesaResultMessage } from "@/lib/mpesa-result-messages";

export type PaymentPollSnapshot = {
  bookingStatus: string;
  paymentStatus: string | null;
  paymentResultCode?: number | null;
};

export type PaymentPollOutcome =
  | { kind: "confirmed" }
  | { kind: "failed"; message: string }
  | { kind: "pending" };

export type PaymentPollResult = "confirmed" | "failed" | "timeout" | "aborted";

/** Derive the next client action from a booking/payment poll snapshot. */
export function evaluatePaymentPoll(
  snapshot: PaymentPollSnapshot,
): PaymentPollOutcome {
  if (snapshot.bookingStatus === "CONFIRMED") {
    return { kind: "confirmed" };
  }

  if (snapshot.paymentStatus === "FAILED") {
    return {
      kind: "failed",
      message: mpesaResultMessage(snapshot.paymentResultCode),
    };
  }

  return { kind: "pending" };
}

export const PAYMENT_POLL_INTERVAL_MS = 2_000;
export const PAYMENT_POLL_MAX_ATTEMPTS = 45;

export function paymentPollTimeoutMs(): number {
  return PAYMENT_POLL_INTERVAL_MS * PAYMENT_POLL_MAX_ATTEMPTS;
}
