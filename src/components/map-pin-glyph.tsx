export function MapPinGlyph({
  large,
  className = "",
}: {
  large?: boolean;
  className?: string;
}) {
  const size = large ? 36 : 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M12 22s7-7.2 7-12.2A7 7 0 1 0 5 9.8C5 14.8 12 22 12 22Z"
        fill="#2F5D4A"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="9.5" r="2.4" fill="#fff" />
    </svg>
  );
}
