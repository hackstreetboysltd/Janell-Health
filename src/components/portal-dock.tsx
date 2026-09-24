"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { persistPortalPreferenceInBackground } from "@/lib/portal-preference";
import type { Portal } from "@/lib/portals";

const ITEMS: { portal: Portal; label: string }[] = [
  { portal: "patient", label: "Patient" },
  { portal: "giver", label: "Caregiver" },
  { portal: "admin", label: "Admin" },
];

/**
 * Guest portal switcher.
 *
 * Patient ↔ Caregiver on `/` updates locally (no RSC wait). Cross-route
 * switches (↔ Admin) navigate immediately and set the preference cookie in
 * the background — never await the cookie POST before routing.
 */
export function PortalDock({
  portal,
  onPortalChange,
}: {
  portal: Portal;
  /** When set, same-route patient/giver switches call this instead of router.replace. */
  onPortalChange?: (portal: Portal) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(portal);

  useEffect(() => {
    setActive(portal);
  }, [portal]);

  useEffect(() => {
    router.prefetch("/admin");
    router.prefetch("/?portal=patient");
    router.prefetch("/?portal=giver");
  }, [router]);

  function choose(next: Portal) {
    if (next === active || pending) return;

    setActive(next);
    persistPortalPreferenceInBackground(next);

    const onHome = pathname === "/";
    const onAdmin = pathname.startsWith("/admin");

    // Same-page patient ↔ giver: instant UI, no server round-trip.
    if (onHome && next !== "admin") {
      if (onPortalChange) {
        onPortalChange(next);
      }
      window.history.replaceState(null, "", `/?portal=${next}`);
      return;
    }

    startTransition(() => {
      if (next === "admin") {
        router.push("/admin");
        return;
      }
      if (onAdmin) {
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
          const isActive = item.portal === active;
          return (
            <li key={item.portal} className="flex-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(item.portal)}
                aria-current={isActive ? "true" : undefined}
                className={`flex min-h-10 w-full items-center justify-center rounded-md px-2 text-sm transition-colors disabled:opacity-70 ${
                  isActive
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
