"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

const ITEMS = [
  { portal: "patient" as const, label: "Patient" },
  { portal: "giver" as const, label: "Healthcare giver" },
];

export function PortalDock({ portal }: { portal: "patient" | "giver" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: "patient" | "giver") {
    if (next === portal || pending) return;
    startTransition(async () => {
      await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: next }),
      });
      router.replace(`${pathname}?portal=${next}`);
    });
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-white/95 backdrop-blur safe-pb"
      aria-label="Choose portal"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1">
        {ITEMS.map((item) => {
          const active = item.portal === portal;
          return (
            <li key={item.portal} className="flex-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(item.portal)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 w-full items-center justify-center px-2 text-center text-sm transition-colors disabled:opacity-70 ${
                  active
                    ? "font-semibold text-sage"
                    : "font-medium text-ink/55 hover:text-ink/80"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-6 bottom-1.5 h-0.5 rounded-full bg-sage transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
