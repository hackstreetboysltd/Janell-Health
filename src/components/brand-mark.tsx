import Link from "next/link";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl sm:text-6xl",
  };
  return (
    <Link href="/" className="font-display text-sage tracking-tight">
      <span className={sizes[size]}>Carelink</span>
      <span className={`${sizes[size]} text-ink/40`}> KE</span>
    </Link>
  );
}
