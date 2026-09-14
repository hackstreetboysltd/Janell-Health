"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit review");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="mt-4 rounded-xl bg-sage/10 px-4 py-3 text-sm text-[#1a6b4a]">
        Thank you — your review helps families find trusted care.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-mist bg-white p-4">
      <h2 className="font-display text-lg">Rate this visit</h2>
      <p className="mt-1 text-sm text-ink/55">
        How was your experience with this professional?
      </p>
      <fieldset className="mt-3">
        <legend className="sr-only">Rating</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`min-h-11 min-w-11 rounded-lg border text-lg ${
                rating >= n
                  ? "border-amber-600 bg-amber-50 text-amber-700"
                  : "border-mist bg-white text-ink/40"
              }`}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm text-ink/70">
        Comment (optional)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
          placeholder="What went well? What could improve?"
        />
      </label>
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 min-h-11 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
