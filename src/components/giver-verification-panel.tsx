"use client";

import { useState, useTransition } from "react";
import { verificationStatusLabel } from "@/lib/verification";
import type { VerificationStatus } from "@prisma/client";

type DocSummary = {
  id: string;
  documentType: string;
  fileName: string;
  createdAt: string;
};

export function GiverVerificationPanel({
  caregiverId,
  status,
  note,
  documents,
}: {
  caregiverId: string;
  status: VerificationStatus;
  note: string | null;
  documents: DocSummary[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(status);

  function submitForReview() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/providers/${caregiverId}/submit-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit");
        return;
      }
      setLocalStatus("UNDER_REVIEW");
    });
  }

  return (
    <section className="rounded-xl border border-mist bg-white p-4">
      <h2 className="font-display text-xl">Verification</h2>
      <p className="mt-1 text-sm text-ink/60">
        Status:{" "}
        <strong className="text-ink">{verificationStatusLabel(localStatus)}</strong>
      </p>
      {note ? (
        <p className="mt-2 rounded-lg bg-alert/5 px-3 py-2 text-sm text-ink/75">
          {note}
        </p>
      ) : null}
      {localStatus === "APPROVED" ? (
        <p className="mt-3 text-sm text-[#1a6b4a]">
          Your profile is verified. Patients can find and book you.
        </p>
      ) : null}
      {documents.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-ink/70">
          {documents.map((doc) => (
            <li key={doc.id}>
              {doc.fileName}{" "}
              <span className="text-xs text-ink/45">({doc.documentType})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink/50">No documents uploaded yet.</p>
      )}
      {(localStatus === "PENDING" || localStatus === "REJECTED") && (
        <button
          type="button"
          disabled={pending || documents.length < 2}
          onClick={submitForReview}
          className="mt-4 min-h-11 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      )}
      {localStatus === "UNDER_REVIEW" ? (
        <p className="mt-4 text-sm text-ink/55">
          Our verification team is reviewing your documents. You will appear in search
          after approval.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
    </section>
  );
}
