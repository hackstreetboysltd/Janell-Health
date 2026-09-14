import { PrismaClient } from "@prisma/client";

const globalForTests = globalThis as unknown as { testPrisma?: PrismaClient };

export const testPrisma =
  globalForTests.testPrisma ??
  new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
    log: ["error"],
  });

if (!globalForTests.testPrisma) {
  globalForTests.testPrisma = testPrisma;
}

export async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await testPrisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Remove test rows between integration cases. */
export async function resetTestData() {
  await testPrisma.adminAuditLog.deleteMany();
  await testPrisma.membershipPurchase.deleteMany();
  await testPrisma.phoneOtp.deleteMany();
  await testPrisma.rateLimitHit.deleteMany();
  await testPrisma.notification.deleteMany();
  await testPrisma.payment.deleteMany();
  await testPrisma.review.deleteMany();
  await testPrisma.visitNote.deleteMany();
  await testPrisma.complaint.deleteMany();
  await testPrisma.booking.deleteMany();
  await testPrisma.caseAttachment.deleteMany();
  await testPrisma.case.deleteMany();
  await testPrisma.providerTimeOff.deleteMany();
  await testPrisma.providerDocument.deleteMany();
  await testPrisma.verificationAudit.deleteMany();
  await testPrisma.caregiverProfile.deleteMany();
  await testPrisma.institution.deleteMany();
  await testPrisma.patientProfile.deleteMany();
  await testPrisma.user.deleteMany({
    where: { email: { endsWith: "@carelink.test" } },
  });
}

export function nextWeekdayAt(hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(hour, minute, 0, 0);
  return date;
}

type BookingFixture = {
  patientId: string;
  otherPatientId: string;
  caregiverId: string;
  caregiverUserId: string;
  caseId: string;
  bookingId: string;
  scheduledAt: Date;
};

export async function seedBookingFixture(): Promise<BookingFixture> {
  const scheduledAt = nextWeekdayAt(10);

  const patient = await testPrisma.user.create({
    data: {
      email: `patient-a-${Date.now()}@carelink.test`,
      name: "Patient A",
      role: "PATIENT",
    },
  });
  const otherPatient = await testPrisma.user.create({
    data: {
      email: `patient-b-${Date.now()}@carelink.test`,
      name: "Patient B",
      role: "PATIENT",
    },
  });
  const caregiverUser = await testPrisma.user.create({
    data: {
      email: `giver-${Date.now()}@carelink.test`,
      name: "Care Giver",
      role: "CAREGIVER",
    },
  });

  const caregiver = await testPrisma.caregiverProfile.create({
    data: {
      userId: caregiverUser.id,
      fullName: "Jane Nurse",
      nationalId: "12345678",
      profession: "NURSE",
      professionId: "NCK-TEST",
      region: "westlands",
      address: "Westlands, Nairobi",
      lat: -1.267,
      lng: 36.81,
      rateType: "VISIT",
      rateKes: 5000,
      availableWeekdaysStart: "08:00",
      availableWeekdaysEnd: "18:00",
      availableWeekendsStart: "09:00",
      availableWeekendsEnd: "14:00",
      verificationStatus: "APPROVED",
      isActive: true,
      specializations: ["wound-care"],
    },
  });

  const caseRecord = await testPrisma.case.create({
    data: {
      patientId: patient.id,
      category: "HOME_NURSING",
      wantHtml: "<p>Test case</p>",
      services: ["wound-care"],
      visitAddress: "Kilimani, Nairobi",
      scheduledAt,
      durationMinutes: 120,
      status: "OPEN",
    },
  });

  const booking = await testPrisma.booking.create({
    data: {
      caseId: caseRecord.id,
      caregiverId: caregiver.id,
      patientId: patient.id,
      grossAmount: 5000,
      platformFee: 500,
      caregiverPayout: 4500,
      scheduledAt,
      durationMinutes: 120,
      visitAddress: caseRecord.visitAddress,
      status: "PENDING_PROVIDER",
    },
  });

  return {
    patientId: patient.id,
    otherPatientId: otherPatient.id,
    caregiverId: caregiver.id,
    caregiverUserId: caregiverUser.id,
    caseId: caseRecord.id,
    bookingId: booking.id,
    scheduledAt,
  };
}
