"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function VisitNoteForm({
  bookingId,
  initialBody,
  readOnly,
}: {
  bookingId: string;
  initialBody?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (readOnly) {
    if (!initialBody) return null;
    return (
      <section className="mt-6 rounded-xl border border-mist bg-white p-4 dark:bg-white/5">
        <h2 className="font-display text-lg">Visit notes</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{initialBody}</p>
      </section>
    );
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/visit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save note");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-mist bg-white p-4 dark:bg-white/5">
      <h2 className="font-display text-lg">Visit notes</h2>
      <p className="mt-1 text-sm text-ink/55">
        Brief record for the patient — not a full medical chart.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className="mt-3 w-full rounded-lg border border-mist bg-canvas px-3 py-2 text-sm dark:border-ink/15 dark:bg-canvas/50"
        placeholder="What was done, observations, follow-up suggestions…"
      />
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
      {saved ? (
        <p className="mt-2 text-sm text-sage">Saved.</p>
      ) : null}
      <button
        type="button"
        disabled={pending || body.trim().length < 10}
        onClick={save}
        className="mt-3 min-h-10 rounded-lg bg-sage px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save visit note"}
      </button>
    </section>
  );
}
