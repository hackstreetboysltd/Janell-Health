import type { VerificationStatus } from "@prisma/client";

type Props = {
  status?: VerificationStatus;
  compact?: boolean;
  className?: string;
};

export function VerifiedBadge({ status = "APPROVED", compact, className = "" }: Props) {
  if (status !== "APPROVED") return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#1a6b4a]/10 font-medium text-[#1a6b4a] ${compact ? "px-2 py-0.5 text-[10px] uppercase tracking-wide" : "px-2.5 py-1 text-xs"} ${className}`}
      title="Janell Health verified professional"
      aria-label="Janell Health verified professional"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
        fill="currentColor"
      >
        <path d="M8 1.2 2.4 3.6v4.1c0 3.1 2.4 5.9 5.6 6.8 3.2-.9 5.6-3.7 5.6-6.8V3.6L8 1.2zm3.2 3.5-4 4.2-1.8-1.8-1 1 2.8 2.8 5-5.2-1-1.8z" />
      </svg>
      {compact ? "Verified" : "Janell Health verified"}
    </span>
  );
}
