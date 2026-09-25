"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav({ role }: { role: "patient" | "giver" }) {
  const pathname = usePathname();
  const items =
    role === "patient"
      ? [
          { href: "/patient", label: "Cases" },
          { href: "/patient/find", label: "Map" },
        ]
      : [
          { href: "/giver", label: "Bookings" },
          { href: "/giver/earnings", label: "Earnings" },
          { href: "/giver/membership", label: "Plans" },
          { href: "/giver/availability", label: "Calendar" },
          { href: "/giver/profile", label: "Profile" },
        ];

  const activeHref = items
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-white/95 backdrop-blur safe-pb dark:border-ink/15 dark:bg-white/5">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 items-center justify-center text-sm transition-colors ${
                  active
                    ? "font-semibold text-sage"
                    : "font-medium text-ink/55 hover:text-ink/80"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-8 bottom-1.5 h-0.5 rounded-full bg-sage transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
