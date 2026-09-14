export function ProBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      aria-label="Professional plan member"
      className={`inline-flex items-center rounded-full bg-sage/15 font-semibold uppercase tracking-wide text-sage ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      Pro
    </span>
  );
}

export function FeaturedBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      aria-label="Featured listing"
      className={`inline-flex items-center rounded-full bg-[#c9a227]/20 font-semibold uppercase tracking-wide text-[#8a6914] dark:text-[#e8c547] ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      Featured
    </span>
  );
}
