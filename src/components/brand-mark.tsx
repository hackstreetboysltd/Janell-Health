import Image from "next/image";
import Link from "next/link";

const ICON = {
  src: "/brand/janell-health-icon.png",
  width: 794,
  height: 794,
  alt: "",
} as const;

const sizes = {
  sm: {
    icon: "h-12 w-12",
    name: "text-base leading-tight",
    tag: "text-[0.7rem] leading-snug",
    gap: "gap-2.5",
  },
  md: {
    icon: "h-14 w-14",
    name: "text-lg leading-tight",
    tag: "text-xs leading-snug",
    gap: "gap-3",
  },
  lg: {
    icon: "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
    name: "text-xl leading-tight sm:text-2xl",
    tag: "text-sm leading-snug",
    gap: "gap-3",
  },
} as const;

export function BrandMark({ size = "md" }: { size?: keyof typeof sizes }) {
  const s = sizes[size];

  return (
    <Link
      href="/"
      aria-label="Janell Health — Compassionate Homecare Nursing Services"
      className={`inline-flex shrink-0 items-center ${s.gap} rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage`}
    >
      <Image
        src={ICON.src}
        alt=""
        width={ICON.width}
        height={ICON.height}
        className={`${s.icon} shrink-0 object-contain`}
        priority={size !== "sm"}
      />
      <span className="flex min-w-0 flex-col justify-center">
        <span className={`${s.name} font-bold tracking-[0.04em] text-brand`}>
          JANELL HEALTH
        </span>
        <span
          className={`${s.tag} mt-0.5 max-w-[15.5rem] font-semibold uppercase tracking-[0.05em] text-brand`}
        >
          Compassionate Homecare Nursing Services
        </span>
      </span>
    </Link>
  );
}
