"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MpesaPayStatus } from "@/components/mpesa-pay-status";
import {
  evaluatePaymentPoll,
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_MAX_ATTEMPTS,
  paymentPollTimeoutMs,
  type PaymentPollResult,
} from "@/lib/payment-poll";

type PayPhase =
  | "idle"
  | "sending"
  | "prompt"
  | "confirming"
  | "success"
  | "failed"
  | "timeout";

export function PayForm({
  bookingId,
  defaultPhone,
}: {
  bookingId: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [phase, setPhase] = useState<PayPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearTimer();
    setSecondsLeft(null);
  }, [clearTimer]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  function startCountdown() {
    clearTimer();
    const totalSec = Math.ceil(paymentPollTimeoutMs() / 1000);
    setSecondsLeft(totalSec);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null || prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function pollBookingStatus(signal: AbortSignal): Promise<PaymentPollResult> {
    for (let attempt = 0; attempt < PAYMENT_POLL_MAX_ATTEMPTS; attempt++) {
      if (signal.aborted) return "aborted";

      await new Promise((r) => setTimeout(r, PAYMENT_POLL_INTERVAL_MS));
      if (signal.aborted) return "aborted";

      const check = await fetch(`/api/bookings/${bookingId}`, { signal });
      if (!check.ok) continue;

      const snapshot = (await check.json()) as {
        status: string;
        paymentStatus: string | null;
        paymentResultCode?: number | null;
      };
      const outcome = evaluatePaymentPoll({
        bookingStatus: snapshot.status,
        paymentStatus: snapshot.paymentStatus,
        paymentResultCode: snapshot.paymentResultCode,
      });

      if (outcome.kind === "confirmed") return "confirmed";
      if (outcome.kind === "failed") {
        setMessage(outcome.message);
        return "failed";
      }
    }
    return signal.aborted ? "aborted" : "timeout";
  }

  function resetToIdle() {
    stopPolling();
    setPhase("idle");
    setMessage(null);
  }

  function cancelPrompt() {
    resetToIdle();
  }

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPhase("sending");
    startTransition(async () => {
      try {
        const res = await fetch("/api/mpesa/stk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, phone }),
        });
        const data = (await res.json()) as { error?: string; mock?: boolean };
        if (!res.ok) {
          setPhase("failed");
          setMessage(data.error || "Could not send the M-Pesa prompt. Check your number and try again.");
          return;
        }

        if (data.mock) {
          setPhase("prompt");
          startCountdown();
          abortRef.current = new AbortController();
          const mockSignal = abortRef.current.signal;
          await new Promise((r) => setTimeout(r, 1200));
          if (mockSignal.aborted) return;

          setPhase("confirming");
          const confirm = await fetch("/api/mpesa/mock-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId }),
            signal: mockSignal,
          });
          if (mockSignal.aborted) return;
          if (!confirm.ok) {
            setPhase("failed");
            setMessage("Mock payment confirmation failed. Try again.");
            stopPolling();
            return;
          }
          setPhase("success");
          stopPolling();
          router.push(`/patient/bookings/${bookingId}`);
          router.refresh();
          return;
        }

        setPhase("prompt");
        startCountdown();
        abortRef.current = new AbortController();
        const result = await pollBookingStatus(abortRef.current.signal);
        stopPolling();

        if (result === "aborted") return;
        if (result === "confirmed") {
          setPhase("success");
          router.push(`/patient/bookings/${bookingId}`);
          router.refresh();
          return;
        }
        if (result === "failed") {
          setPhase("failed");
          return;
        }
        setPhase("timeout");
        setMessage("No confirmation received in time.");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        stopPolling();
        setPhase("failed");
        setMessage("Network error. Check your connection and try again.");
      }
    });
  }

  const isBusy =
    pending || phase === "sending" || phase === "prompt" || phase === "confirming";
  const canRetry = phase === "failed" || phase === "timeout";
  const submitLabel =
    phase === "sending"
      ? "Sending prompt…"
      : phase === "prompt"
        ? "Waiting for PIN…"
        : phase === "confirming"
          ? "Confirming…"
          : canRetry
            ? "Send M-Pesa prompt again"
            : "Pay with M-Pesa";

  return (
    <form onSubmit={pay} className="mt-8 flex flex-col gap-5 animate-fade-up">
      <label className="text-sm font-medium text-ink/80">
        M-Pesa number
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-xl border border-mist bg-white px-3 font-mono text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage disabled:opacity-60"
          placeholder="07XXXXXXXX"
          inputMode="tel"
          autoComplete="tel"
          disabled={isBusy}
          aria-describedby="pay-phone-hint"
        />
      </label>
      <p id="pay-phone-hint" className="-mt-3 text-xs leading-relaxed text-ink/50">
        Use the Safaricom number that receives M-Pesa prompts.
      </p>

      <MpesaPayStatus
        phase={phase}
        secondsLeft={secondsLeft}
        message={message}
        onCancel={phase === "prompt" ? cancelPrompt : undefined}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0">
        <button
          type="submit"
          disabled={isBusy}
          className="btn-pay disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
