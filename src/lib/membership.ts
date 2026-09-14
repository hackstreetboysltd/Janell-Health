import type { MembershipTier } from "@prisma/client";

export const MEMBERSHIP_PLANS = {
  basic: {
    id: "basic" as const,
    tier: "BASIC" as MembershipTier,
    label: "Basic",
    priceKes: 0,
    blurb: "Listed after verification. Standard map placement.",
  },
  professional: {
    id: "professional" as const,
    tier: "PROFESSIONAL" as MembershipTier,
    label: "Professional",
    priceKes: 500,
    days: 30,
    blurb: "Pro badge, priority in search tie-breaks, earnings insights.",
  },
  featured: {
    id: "featured" as const,
    label: "Featured listing",
    priceKes: 1000,
    days: 30,
    blurb: "Top of map results for your area — paid boost.",
  },
} as const;

export type PaidPlanId = "professional" | "featured";

export function isMembershipActive(until: Date | null | undefined): boolean {
  if (!until) return false;
  return until.getTime() > Date.now();
}

export function isFeatured(until: Date | null | undefined): boolean {
  return isMembershipActive(until);
}

export function effectiveTier(
  tier: MembershipTier,
  membershipUntil: Date | null | undefined,
): MembershipTier {
  if (tier === "PROFESSIONAL" && isMembershipActive(membershipUntil)) {
    return "PROFESSIONAL";
  }
  return "BASIC";
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
