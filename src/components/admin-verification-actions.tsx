"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminVerificationActions({
  caregiverId,
  currentStatus,
}: {
  caregiverId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function act(action: "approve" | "reject" | "suspend") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/providers/${caregiverId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="block text-sm text-ink/70">
        Note (optional for approve; recommended for reject)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-mist px-3 py-2 text-sm"
          placeholder="Reason or internal note…"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {(currentStatus === "UNDER_REVIEW" ||
          currentStatus === "PENDING" ||
          currentStatus === "REJECTED") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("approve")}
            className="min-h-10 rounded-lg bg-[#1a6b4a] px-4 text-sm font-semibold text-white"
          >
            Approve
          </button>
        )}
        {currentStatus === "UNDER_REVIEW" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("reject")}
            className="min-h-10 rounded-lg border border-alert px-4 text-sm font-semibold text-alert"
          >
            Reject
          </button>
        )}
        {currentStatus === "APPROVED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("suspend")}
            className="min-h-10 rounded-lg border border-alert/40 px-4 text-sm font-semibold text-alert"
          >
            Suspend
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
    </div>
  );
}
