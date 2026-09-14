import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as runRetention } from "@/app/api/admin/retention/route";
import { DATA_RETENTION, purgeExpiredData } from "@/lib/data-retention";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

import { auth } from "@/auth";

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("data retention", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("purges stale OTP rows, visit notes, dismissed complaints, and old verification docs", async () => {
    const patient = await testPrisma.user.create({
      data: {
        email: `patient-${Date.now()}@carelink.test`,
        name: "Patient",
        role: "PATIENT",
      },
    });
    const giverUser = await testPrisma.user.create({
      data: {
        email: `giver-${Date.now()}@carelink.test`,
        name: "Giver",
        role: "CAREGIVER",
      },
    });
    const caregiver = await testPrisma.caregiverProfile.create({
      data: {
        userId: giverUser.id,
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
      },
    });

    const staleOtpDate = new Date(
      Date.now() - (DATA_RETENTION.phoneOtpHours + 1) * 60 * 60 * 1000,
    );
    await testPrisma.phoneOtp.create({
      data: {
        phone: "254712345678",
        codeHash: "hash",
        expiresAt: new Date(Date.now() - 60_000),
        createdAt: staleOtpDate,
      },
    });

    const staleNoteDate = new Date(
      Date.now() - (DATA_RETENTION.visitNoteDays + 1) * 24 * 60 * 60 * 1000,
    );
    const caseRecord = await testPrisma.case.create({
      data: {
        patientId: patient.id,
        category: "HOME_NURSING",
        wantHtml: "<p>Test</p>",
        services: ["wound-care"],
        visitAddress: "Nairobi",
        scheduledAt: staleNoteDate,
        durationMinutes: 120,
        status: "COMPLETED",
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
        scheduledAt: staleNoteDate,
        durationMinutes: 120,
        visitAddress: "Nairobi",
        status: "COMPLETED",
      },
    });
    await testPrisma.visitNote.create({
      data: {
        bookingId: booking.id,
        caregiverId: caregiver.id,
        body: "Old note",
        updatedAt: staleNoteDate,
      },
    });

    const staleComplaintDate = new Date(
      Date.now() - (DATA_RETENTION.dismissedComplaintDays + 1) * 24 * 60 * 60 * 1000,
    );
    await testPrisma.complaint.create({
      data: {
        reporterId: patient.id,
        type: "SUPPORT",
        subject: "Old ticket",
        body: "Dismissed long ago",
        status: "DISMISSED",
        updatedAt: staleComplaintDate,
      },
    });

    const staleDocDate = new Date(
      Date.now() -
        (DATA_RETENTION.verificationDocDaysAfterApproval + 1) * 24 * 60 * 60 * 1000,
    );
    await testPrisma.verificationAudit.create({
      data: {
        caregiverId: caregiver.id,
        adminUserId: giverUser.id,
        action: "APPROVED",
        createdAt: staleDocDate,
      },
    });
    await testPrisma.providerDocument.create({
      data: {
        caregiverId: caregiver.id,
        documentType: "NATIONAL_ID",
        fileName: "id.pdf",
        mimeType: "application/pdf",
        storageKey: "providers/test/id.pdf",
        sizeBytes: 100,
        createdAt: staleDocDate,
      },
    });

    const purged = await purgeExpiredData();
    expect(purged.phoneOtp).toBe(1);
    expect(purged.visitNotes).toBe(1);
    expect(purged.dismissedComplaints).toBe(1);
    expect(purged.verificationDocuments).toBe(1);
  });

  it("requires admin role to run retention via API", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: `patient-${Date.now()}@carelink.test`,
        name: "Patient",
        role: "PATIENT",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: user.id, email: user.email, role: "PATIENT" },
    } as never);

    const denied = await runRetention(
      new Request("http://localhost/api/admin/retention", { method: "POST" }),
    );
    expect(denied.status).toBe(403);
  });
});
