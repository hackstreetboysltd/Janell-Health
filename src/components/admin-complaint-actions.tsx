"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminComplaintActions({
  complaintId,
  currentStatus,
}: {
  complaintId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(action: "resolve" | "dismiss") {
    startTransition(async () => {
      await fetch(`/api/admin/complaints/${complaintId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    });
  }

  if (currentStatus !== "OPEN") return null;

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => act("resolve")}
        className="min-h-8 rounded-lg bg-sage px-3 text-xs font-semibold text-white"
      >
        Resolve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act("dismiss")}
        className="min-h-8 rounded-lg border border-mist px-3 text-xs font-semibold"
      >
        Dismiss
      </button>
    </div>
  );
}
