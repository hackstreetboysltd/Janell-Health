import { describe, expect, it } from "vitest";
import {
  evaluatePaymentPoll,
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_MAX_ATTEMPTS,
  paymentPollTimeoutMs,
} from "@/lib/payment-poll";

describe("evaluatePaymentPoll", () => {
  it("returns confirmed when booking is CONFIRMED", () => {
    expect(
      evaluatePaymentPoll({
        bookingStatus: "CONFIRMED",
        paymentStatus: "SUCCESS",
      }),
    ).toEqual({ kind: "confirmed" });
  });

  it("returns failed with mapped message when payment failed", () => {
    const outcome = evaluatePaymentPoll({
      bookingStatus: "PENDING_PAYMENT",
      paymentStatus: "FAILED",
      paymentResultCode: 1032,
    });
    expect(outcome.kind).toBe("failed");
    if (outcome.kind === "failed") {
      expect(outcome.message).toContain("cancelled");
    }
  });

  it("returns pending while payment is still open", () => {
    expect(
      evaluatePaymentPoll({
        bookingStatus: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
      }),
    ).toEqual({ kind: "pending" });
  });
});

describe("payment poll timing", () => {
  it("waits up to 90 seconds before timing out", () => {
    expect(PAYMENT_POLL_INTERVAL_MS).toBe(2000);
    expect(PAYMENT_POLL_MAX_ATTEMPTS).toBe(45);
    expect(paymentPollTimeoutMs()).toBe(90_000);
  });
});
