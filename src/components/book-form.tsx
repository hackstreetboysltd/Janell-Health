"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKes } from "@/lib/commission";

export function BookForm({
  caseId,
  caregiverId,
  amount,
}: {
  caseId: string;
  caregiverId: string;
  amount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, caregiverId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create booking");
        return;
      }
      router.push(`/patient/pay/${data.id}`);
    });
  }

  return (
    <div className="mt-8">
      {error ? <p className="mb-3 text-sm text-alert">{error}</p> : null}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="min-h-12 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : `Pay ${formatKes(amount)} with M-Pesa`}
        </button>
      </div>
    </div>
  );
}
