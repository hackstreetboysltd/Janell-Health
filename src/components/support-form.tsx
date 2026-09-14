"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SupportForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUPPORT",
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send message");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="rounded-xl bg-sage/10 px-4 py-3 text-sm text-[#1a6b4a]">
        Message received. We will reply to {defaultEmail} as soon as we can.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="block text-sm font-medium text-ink/80">
        Subject
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="field mt-1 w-full rounded-lg border border-mist px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium text-ink/80">
        How can we help?
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          minLength={20}
          className="field mt-1 w-full resize-none rounded-lg border border-mist px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-sage font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
