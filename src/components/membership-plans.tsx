"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKes } from "@/lib/commission";
import { MEMBERSHIP_PLANS, type PaidPlanId } from "@/lib/membership";
import type { MembershipTier } from "@prisma/client";

export function MembershipPlans({
  currentTier,
  membershipUntil,
  featuredUntil,
  featuredActive,
  mockBilling,
}: {
  currentTier: MembershipTier;
  membershipUntil: string | null;
  featuredUntil: string | null;
  featuredActive: boolean;
  mockBilling: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upgrade(plan: PaidPlanId) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/giver/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upgrade failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <PlanCard
        title={MEMBERSHIP_PLANS.basic.label}
        price="Free"
        blurb={MEMBERSHIP_PLANS.basic.blurb}
        active={currentTier === "BASIC"}
        statusLabel={
          currentTier === "PROFESSIONAL" && membershipUntil
            ? `Pro until ${new Date(membershipUntil).toLocaleDateString("en-KE")}`
            : "Current"
        }
      />

      <PlanCard
        title={MEMBERSHIP_PLANS.professional.label}
        price={`${formatKes(MEMBERSHIP_PLANS.professional.priceKes)}/mo`}
        blurb={MEMBERSHIP_PLANS.professional.blurb}
        active={currentTier === "PROFESSIONAL"}
        statusLabel={
          membershipUntil
            ? `Active until ${new Date(membershipUntil).toLocaleDateString("en-KE")}`
            : undefined
        }
        action={
          mockBilling ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => upgrade("professional")}
              className="mt-3 min-h-10 w-full rounded-lg bg-sage text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Processing…" : "Upgrade (mock M-Pesa)"}
            </button>
          ) : (
            <p className="mt-3 text-xs text-ink/50">
              Contact support to activate Professional membership.
            </p>
          )
        }
      />

      <PlanCard
        title={MEMBERSHIP_PLANS.featured.label}
        price={`${formatKes(MEMBERSHIP_PLANS.featured.priceKes)}/mo`}
        blurb={MEMBERSHIP_PLANS.featured.blurb}
        active={featuredActive}
        statusLabel={
          featuredUntil
            ? `Boost until ${new Date(featuredUntil).toLocaleDateString("en-KE")}`
            : undefined
        }
        action={
          mockBilling ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => upgrade("featured")}
              className="mt-3 min-h-10 w-full rounded-lg border border-sage bg-white text-sm font-semibold text-sage disabled:opacity-60 dark:bg-white/5"
            >
              {pending ? "Processing…" : "Boost listing (mock M-Pesa)"}
            </button>
          ) : (
            <p className="mt-3 text-xs text-ink/50">
              Contact support for featured placement.
            </p>
          )
        }
      />

      {error ? <p className="text-sm text-alert">{error}</p> : null}

      <p className="text-xs text-ink/45">
        Automated M-Pesa B2C payouts to providers are planned — earnings remain
        informational until then.
      </p>
    </div>
  );
}

function PlanCard({
  title,
  price,
  blurb,
  active,
  statusLabel,
  action,
}: {
  title: string;
  price: string;
  blurb: string;
  active?: boolean;
  statusLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <article
      className={`rounded-xl border px-4 py-4 ${
        active ? "border-sage/40 bg-sage/5" : "border-mist bg-white dark:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg">{title}</h3>
        <span className="font-mono text-sm text-sage">{price}</span>
      </div>
      <p className="mt-2 text-sm text-ink/65">{blurb}</p>
      {statusLabel ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-sage">
          {statusLabel}
        </p>
      ) : null}
      {action}
    </article>
  );
}
