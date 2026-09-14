import type { MembershipTier, VerificationStatus } from "@prisma/client";
import { FeaturedBadge, ProBadge } from "@/components/plan-badges";
import { VerifiedBadge } from "@/components/verified-badge";

type Props = {
  verificationStatus: VerificationStatus;
  membershipTier?: MembershipTier;
  featured?: boolean;
  compact?: boolean;
  className?: string;
};

/** Consistent verified + plan badges on map, profile, and booking flows. */
export function CaregiverBadgeRow({
  verificationStatus,
  membershipTier,
  featured = false,
  compact = false,
  className = "",
}: Props) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <VerifiedBadge status={verificationStatus} compact={compact} />
      {featured ? <FeaturedBadge compact={compact} /> : null}
      {membershipTier === "PROFESSIONAL" ? <ProBadge compact={compact} /> : null}
    </span>
  );
}
