"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Portal hub / bottom-nav destinations — no back control. */
const LANDING_PATHS = new Set([
  "/patient",
  "/patient/cases/new",
  "/patient/find",
  "/giver",
  "/giver/earnings",
  "/giver/membership",
  "/giver/availability",
  "/giver/profile",
  "/admin",
  "/onboarding/patient",
  "/onboarding/giver",
]);

export function isModuleLanding(pathname: string): boolean {
  if (LANDING_PATHS.has(pathname)) return true;
  // Referral partner landings are entry points, not sub-modules.
  if (pathname.startsWith("/referral/")) return true;
  return false;
}

/** Sensible parent route for portal and standalone modules. */
export function inferBackHref(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const root = segments[0];
  if (root === "patient" || root === "giver" || root === "admin") {
    return segments.length === 1 ? "/" : `/${root}`;
  }
  if (root === "emergency" || root === "support") return "/patient";
  if (root === "legal" || root === "onboarding" || root === "referral") {
    return "/";
  }
  return "/";
}

export function ModuleBackLink({
  href,
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const target = href ?? inferBackHref(pathname);

  return (
    <Link
      href={target}
      aria-label="Go back"
      className={`-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-sage transition hover:bg-sage/10 ${className}`}
    >
      <span aria-hidden>←</span>
    </Link>
  );
}

/** Module title row: back control aligned with the heading on sub-modules only. */
export function ModuleHeading({
  children,
  backHref,
  showBack,
  className = "font-display text-3xl",
  wrapperClassName = "mt-8",
  id,
  trailing,
}: {
  children: ReactNode;
  backHref?: string;
  /** Override auto landing detection. Defaults to off on hub/tab landings. */
  showBack?: boolean;
  className?: string;
  wrapperClassName?: string;
  id?: string;
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const withBack = showBack ?? !isModuleLanding(pathname);

  return (
    <div className={`flex items-center gap-1.5 ${wrapperClassName}`}>
      {withBack ? <ModuleBackLink href={backHref} /> : null}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <h1 id={id} className={className}>
          {children}
        </h1>
        {trailing}
      </div>
    </div>
  );
}
