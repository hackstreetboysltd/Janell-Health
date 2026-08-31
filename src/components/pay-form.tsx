"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function PayForm({
  bookingId,
  defaultPhone,
}: {
  bookingId: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [status, setStatus] = useState<"idle" | "waiting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setStatus("waiting");
    startTransition(async () => {
      const res = await fetch("/api/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Payment failed to start");
        return;
      }

      if (data.mock) {
        // Simulate phone PIN success after brief wait
        await new Promise((r) => setTimeout(r, 1200));
        const confirm = await fetch("/api/mpesa/mock-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        if (!confirm.ok) {
          setStatus("error");
          setMessage("Mock confirm failed");
          return;
        }
        setStatus("success");
        setMessage("Payment successful");
        router.push(`/patient/bookings/${bookingId}`);
        router.refresh();
        return;
      }

      // Poll booking status for live STK
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const check = await fetch(`/api/bookings/${bookingId}`);
        const b = await check.json();
        if (b.status === "CONFIRMED") {
          setStatus("success");
          setMessage("Payment successful");
          router.push(`/patient/bookings/${bookingId}`);
          router.refresh();
          return;
        }
        if (b.paymentStatus === "FAILED") {
          setStatus("error");
          setMessage("Payment failed or cancelled on phone");
          return;
        }
      }
      setStatus("error");
      setMessage("Timed out waiting for M-Pesa. Try again.");
    });
  }

  return (
    <form onSubmit={pay} className="mt-8 flex flex-col gap-4">
      <label className="text-sm font-medium text-ink/80">
        M-Pesa number
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-lg border border-mist bg-white px-3"
          placeholder="07XXXXXXXX"
          inputMode="tel"
          disabled={status === "waiting" || pending}
        />
      </label>

      {status === "waiting" ? (
        <div className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-4 text-sm text-ink/80">
          Check your phone and enter your M-Pesa PIN…
        </div>
      ) : null}
      {status === "success" ? (
        <div className="rounded-xl border border-sage/30 bg-sage/10 px-4 py-4 text-sm font-medium text-sage">
          Success — continuing…
        </div>
      ) : null}
      {message && status === "error" ? (
        <p className="text-sm text-alert">{message}</p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0">
        <button
          type="submit"
          disabled={pending || status === "waiting"}
          className="min-h-12 w-full rounded-xl bg-alert font-semibold text-white disabled:opacity-60"
        >
          {status === "waiting" ? "Waiting for PIN…" : "Pay with M-Pesa"}
        </button>
      </div>
    </form>
  );
}
