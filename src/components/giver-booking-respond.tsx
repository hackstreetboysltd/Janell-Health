"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GiverBookingRespond({
  bookingId,
}: {
  bookingId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function respond(action: "accept" | "reject") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update booking");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="text-sm text-ink/70">
        Note to patient (optional on accept; helpful if declining)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("accept")}
          className="min-h-11 flex-1 rounded-xl bg-sage font-semibold text-white disabled:opacity-60"
        >
          Accept visit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond("reject")}
          className="min-h-11 flex-1 rounded-xl border border-alert font-semibold text-alert disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
    </div>
  );
}
