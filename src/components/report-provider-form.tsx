"use client";

import { useState, useTransition } from "react";

export function ReportProviderForm({
  bookingId,
  caregiverId,
  caregiverName,
}: {
  bookingId: string;
  caregiverId: string;
  caregiverName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [body, setBody] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REPORT_PROVIDER",
          bookingId,
          caregiverId,
          subject: `Report: ${caregiverName}`,
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit report");
        return;
      }
      setDone(true);
      setOpen(false);
    });
  }

  if (done) {
    return (
      <p className="mt-4 text-sm text-ink/60">
        Report received. Our team will review within 1–2 business days.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-medium text-alert underline-offset-2 hover:underline"
      >
        Report this professional
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-alert/25 bg-white p-4">
      <h2 className="text-sm font-semibold text-ink">Report {caregiverName}</h2>
      <p className="mt-1 text-xs text-ink/55">
        For emergencies, call 999 / 112. This form is for safety and conduct concerns.
      </p>
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        minLength={20}
        className="mt-3 w-full rounded-lg border border-mist px-3 py-2 text-sm"
        placeholder="Describe what happened…"
      />
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 flex-1 rounded-lg bg-alert font-semibold text-white text-sm disabled:opacity-60"
        >
          {pending ? "Sending…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 rounded-lg border border-mist px-4 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
