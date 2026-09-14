import type { Prisma, VerificationStatus } from "@prisma/client";
import { verificationRequired } from "@/lib/feature-flags";

export function isVerifiedStatus(status: VerificationStatus): boolean {
  return status === "APPROVED";
}

export function searchableCaregiverWhere(): Prisma.CaregiverProfileWhereInput {
  const base: Prisma.CaregiverProfileWhereInput = { isActive: true };
  if (verificationRequired()) {
    base.verificationStatus = "APPROVED";
  }
  return base;
}

export function verificationStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending documents";
    case "UNDER_REVIEW":
      return "Under review";
    case "APPROVED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status;
  }
}
