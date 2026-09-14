"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function CompleteVisitButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function complete() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not mark complete");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={pending}
        onClick={complete}
        className="min-h-11 w-full rounded-xl border border-sage font-semibold text-sage disabled:opacity-60"
      >
        {pending ? "Saving…" : "Mark visit complete"}
      </button>
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
    </div>
  );
}
