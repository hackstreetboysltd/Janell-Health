import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deleteCaseFile,
  deleteProviderDocumentFile,
} from "@/lib/storage";

const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_PROVIDER",
  "PENDING_PAYMENT",
  "CONFIRMED",
];

export { BLOCKING_BOOKING_STATUSES };

export type ErasureBlockReason = {
  code: "ACTIVE_BOOKINGS" | "ACTIVE_CAREGIVER_BOOKINGS";
  count: number;
};

export async function getErasureBlockers(
  userId: string,
): Promise<ErasureBlockReason | null> {
  const [patientActive, caregiverProfile] = await Promise.all([
    prisma.booking.count({
      where: {
        patientId: userId,
        status: { in: BLOCKING_BOOKING_STATUSES },
      },
    }),
    prisma.caregiverProfile.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (patientActive > 0) {
    return { code: "ACTIVE_BOOKINGS", count: patientActive };
  }

  if (caregiverProfile) {
    const caregiverActive = await prisma.booking.count({
      where: {
        caregiverId: caregiverProfile.id,
        status: { in: BLOCKING_BOOKING_STATUSES },
      },
    });
    if (caregiverActive > 0) {
      return { code: "ACTIVE_CAREGIVER_BOOKINGS", count: caregiverActive };
    }
  }

  return null;
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      caregiverProfile: {
        include: {
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
        },
      },
      cases: {
        include: {
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
          booking: {
            include: {
              payment: {
                select: {
                  status: true,
                  mpesaPhone: true,
                  createdAt: true,
                },
              },
              review: true,
            },
          },
        },
      },
      bookingsAsPatient: {
        include: {
          payment: {
            select: { status: true, createdAt: true },
          },
          review: true,
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 200,
      },
      complaints: true,
      reviewsWritten: true,
    },
  });

  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    patientProfile: user.patientProfile,
    caregiverProfile: user.caregiverProfile
      ? {
          ...user.caregiverProfile,
          documents: user.caregiverProfile.documents,
        }
      : null,
    cases: user.cases,
    bookingsAsPatient: user.bookingsAsPatient,
    notifications: user.notifications,
    complaints: user.complaints,
    reviewsWritten: user.reviewsWritten,
  };
}

async function deleteUserStorageObjects(userId: string) {
  const cases = await prisma.case.findMany({
    where: { patientId: userId },
    include: { attachments: true },
  });
  for (const caseRecord of cases) {
    for (const attachment of caseRecord.attachments) {
      if (attachment.storageKey) {
        try {
          await deleteCaseFile(attachment.storageKey);
        } catch {
          // Object may already be gone — continue erasure.
        }
      }
    }
  }

  const caregiver = await prisma.caregiverProfile.findUnique({
    where: { userId },
    include: { documents: true },
  });
  if (caregiver) {
    for (const document of caregiver.documents) {
      if (document.storageKey) {
        try {
          await deleteProviderDocumentFile(document.storageKey);
        } catch {
          // continue
        }
      }
    }
  }
}

export async function eraseUserAccount(userId: string) {
  const blocker = await getErasureBlockers(userId);
  if (blocker) {
    return { ok: false as const, blocker };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (!user) {
    return { ok: false as const, error: "User not found" };
  }

  await deleteUserStorageObjects(userId);

  if (user.phone) {
    await prisma.phoneOtp.deleteMany({ where: { phone: user.phone } });
  }

  await prisma.user.delete({ where: { id: userId } });

  return { ok: true as const };
}
