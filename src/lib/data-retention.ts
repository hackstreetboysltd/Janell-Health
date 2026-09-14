import { prisma } from "@/lib/prisma";
import { deleteProviderDocumentFile } from "@/lib/storage";

export const DATA_RETENTION = {
  /** Expired or stale OTP challenge rows. */
  phoneOtpHours: 24,
  /** Visit notes on completed bookings. */
  visitNoteDays: 90,
  /** Dismissed support/report tickets. */
  dismissedComplaintDays: 90,
  /** Verification uploads after provider approval. */
  verificationDocDaysAfterApproval: 30,
} as const;

export type RetentionPurgeCounts = {
  phoneOtp: number;
  visitNotes: number;
  dismissedComplaints: number;
  verificationDocuments: number;
};

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function purgeExpiredData(): Promise<RetentionPurgeCounts> {
  const otpCutoff = hoursAgo(DATA_RETENTION.phoneOtpHours);
  const visitNoteCutoff = daysAgo(DATA_RETENTION.visitNoteDays);
  const complaintCutoff = daysAgo(DATA_RETENTION.dismissedComplaintDays);
  const docCutoff = daysAgo(DATA_RETENTION.verificationDocDaysAfterApproval);

  const phoneOtp = await prisma.phoneOtp.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { createdAt: { lt: otpCutoff } }],
    },
  });

  const visitNotes = await prisma.visitNote.deleteMany({
    where: {
      updatedAt: { lt: visitNoteCutoff },
      booking: { status: "COMPLETED" },
    },
  });

  const dismissedComplaints = await prisma.complaint.deleteMany({
    where: {
      status: "DISMISSED",
      updatedAt: { lt: complaintCutoff },
    },
  });

  const staleDocs = await prisma.providerDocument.findMany({
    where: {
      createdAt: { lt: docCutoff },
      caregiver: {
        verificationStatus: "APPROVED",
        verificationAudits: {
          some: {
            action: "APPROVED",
            createdAt: { lt: docCutoff },
          },
        },
      },
    },
    select: { id: true, storageKey: true },
  });

  for (const doc of staleDocs) {
    try {
      await deleteProviderDocumentFile(doc.storageKey);
    } catch {
      // Storage may already be gone; still drop the DB row.
    }
  }

  const verificationDocuments = staleDocs.length
    ? (
        await prisma.providerDocument.deleteMany({
          where: { id: { in: staleDocs.map((doc) => doc.id) } },
        })
      ).count
    : 0;

  return {
    phoneOtp: phoneOtp.count,
    visitNotes: visitNotes.count,
    dismissedComplaints: dismissedComplaints.count,
    verificationDocuments,
  };
}
