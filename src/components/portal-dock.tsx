"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Portal } from "@/lib/portals";

const ITEMS: { portal: Portal; label: string }[] = [
  { portal: "patient", label: "Patient" },
  { portal: "giver", label: "Caregiver" },
  { portal: "admin", label: "Admin" },
];

export function PortalDock({ portal }: { portal: Portal }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Portal) {
    if (next === portal || pending) return;
    startTransition(async () => {
      await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: next }),
      });
      if (next === "admin") {
        router.push("/admin");
        return;
      }
      if (pathname.startsWith("/admin")) {
        router.push(`/?portal=${next}`);
        return;
      }
      router.replace(`${pathname}?portal=${next}`);
    });
  }

  return (
    <nav aria-label="Choose portal">
      <ul className="flex rounded-lg border border-mist bg-canvas/60 p-1 dark:border-ink/15 dark:bg-white/5">
        {ITEMS.map((item) => {
          const active = item.portal === portal;
          return (
            <li key={item.portal} className="flex-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(item.portal)}
                aria-current={active ? "true" : undefined}
                className={`flex min-h-10 w-full items-center justify-center rounded-md px-2 text-sm transition-colors disabled:opacity-70 ${
                  active
                    ? "bg-white font-medium text-ink shadow-sm dark:bg-white/10"
                    : "font-medium text-ink/50 hover:text-ink/75"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
