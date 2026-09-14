import Image from "next/image";
import Link from "next/link";

const LOGO = {
  src: "/brand/janell-health-logo.png",
  width: 1778,
  height: 885,
  alt: "Janell Health — Compassionate homecare nursing",
} as const;

const sizes = {
  sm: "h-9 w-auto max-w-[10.5rem]",
  md: "h-11 w-auto max-w-[13rem]",
  lg: "h-16 w-auto max-w-[18rem] sm:h-[4.5rem] sm:max-w-[22rem]",
} as const;

export function BrandMark({ size = "md" }: { size?: keyof typeof sizes }) {
  return (
    <Link
      href="/"
      className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
    >
      <Image
        src={LOGO.src}
        alt={LOGO.alt}
        width={LOGO.width}
        height={LOGO.height}
        className={sizes[size]}
        priority={size !== "sm"}
      />
    </Link>
  );
}
