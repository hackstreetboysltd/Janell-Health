type Props = {
  average: number;
  count: number;
  compact?: boolean;
};

export function StarRating({ average, count, compact }: Props) {
  if (count === 0) {
    return (
      <span className={`text-ink/45 ${compact ? "text-xs" : "text-sm"}`}>
        No reviews yet
      </span>
    );
  }

  const stars = Math.round(average * 2) / 2;
  return (
    <span
      className={`inline-flex items-center gap-1 text-amber-700 ${compact ? "text-xs" : "text-sm"}`}
      title={`${average.toFixed(1)} out of 5 from ${count} reviews`}
    >
      <span aria-hidden>{renderStars(stars)}</span>
      <span className="font-mono">
        {average.toFixed(1)} ({count})
      </span>
    </span>
  );
}

function renderStars(value: number) {
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}
