"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Portal hub / bottom-nav destinations — no back control. */
const LANDING_PATHS = new Set([
  "/patient",
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
      className={`module-back flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-sage transition hover:bg-sage/10 ${className}`}
    >
      <span aria-hidden>←</span>
    </Link>
  );
}

/** Compact create affordance for list hubs — sits on the right of ModuleHeading. */
export function ModuleAddLink({
  href,
  label,
  className = "",
}: {
  href: string;
  /** Accessible name; visible label is only "+". */
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`module-add-link ${className}`}
    >
      <span aria-hidden>+</span>
    </Link>
  );
}

/** Same look as ModuleAddLink for in-page create actions (no navigation). */
export function ModuleAddButton({
  label,
  onClick,
  className = "",
  type = "button",
  disabled,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`module-add-link disabled:opacity-50 ${className}`}
    >
      <span aria-hidden>+</span>
    </button>
  );
}

/**
 * Module title — Sherehe-style: back / trail on a lead row, title centered below
 * (never beside the back control).
 */
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
  /** Right-aligned slot on the lead row (e.g. ModuleAddLink, badges). */
  trailing?: ReactNode;
}) {
  const pathname = usePathname();
  const withBack = showBack ?? !isModuleLanding(pathname);
  const showLead = withBack || Boolean(trailing);

  return (
    <header className={`module-head ${wrapperClassName}`}>
      {showLead ? (
        <div className="module-head-lead">
          {withBack ? <ModuleBackLink href={backHref} /> : null}
          {trailing ? <div className="module-head-trail">{trailing}</div> : null}
        </div>
      ) : null}
      <h1 id={id} className={className}>
        {children}
      </h1>
    </header>
  );
}
