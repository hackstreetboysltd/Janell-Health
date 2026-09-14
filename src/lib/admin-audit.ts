import { prisma } from "@/lib/prisma";

export const ADMIN_AUDIT_ACTIONS = {
  verificationApproved: "VERIFICATION_APPROVED",
  verificationRejected: "VERIFICATION_REJECTED",
  verificationSuspended: "VERIFICATION_SUSPENDED",
  complaintResolved: "COMPLAINT_RESOLVED",
  complaintDismissed: "COMPLAINT_DISMISSED",
  accountErasure: "ACCOUNT_ERASURE",
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export async function recordAdminAudit(opts: {
  adminUserId?: string | null;
  action: AdminAuditAction | string;
  targetType: "caregiver" | "complaint" | "user" | string;
  targetId: string;
  note?: string | null;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: opts.adminUserId ?? null,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      note: opts.note ?? null,
    },
  });
}
