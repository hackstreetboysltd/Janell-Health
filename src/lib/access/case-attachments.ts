import { prisma } from "@/lib/prisma";

export type CaseAttachmentAccess = "patient" | "caregiver" | null;

export async function getCaseAttachmentAccess(
  userId: string,
  caseId: string,
): Promise<CaseAttachmentAccess> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      booking: {
        include: {
          caregiver: { select: { userId: true } },
        },
      },
    },
  });

  if (!caseRecord) return null;
  if (caseRecord.patientId === userId) return "patient";

  const booking = caseRecord.booking;
  if (
    booking?.status === "CONFIRMED" &&
    booking.caregiver.userId === userId
  ) {
    return "caregiver";
  }

  return null;
}

export async function canUploadCaseAttachments(
  userId: string,
  caseId: string,
): Promise<boolean> {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    select: { patientId: true, status: true },
  });

  return caseRecord?.patientId === userId && caseRecord.status === "OPEN";
}
