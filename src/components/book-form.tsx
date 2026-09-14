"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKes } from "@/lib/commission";
import { FormErrorAlert } from "@/components/form-error-alert";

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
        setError(data.error || "Could not send request");
        return;
      }
      router.push(`/patient/bookings/${data.id}`);
    });
  }

  return (
    <div className="mt-8 animate-fade-up" style={{ animationDelay: "0.12s" }}>
      {error ? <FormErrorAlert message={error} showRetryHint={false} /> : null}
      <p className="mb-3 text-sm leading-relaxed text-ink/55">
        The professional reviews your request first. You pay{" "}
        <span className="font-mono font-medium text-ink/75">{formatKes(amount)}</span> with
        M-Pesa only after they accept.
      </p>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="btn-primary w-full disabled:opacity-60"
        >
          {pending ? "Sending request…" : "Send booking request"}
        </button>
      </div>
    </div>
  );
}
