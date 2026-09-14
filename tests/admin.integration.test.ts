import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as resolveComplaint } from "@/app/api/admin/complaints/[complaintId]/route";
import { POST as verificationDecision } from "@/app/api/admin/providers/[caregiverId]/verification/route";
import { POST as eraseAccount } from "@/app/api/me/erase/route";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { isAdminUser, requireAdminSession } from "@/lib/access/admin";
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

describeIntegration("admin access control", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 for non-admin sessions on admin routes", async () => {
    const reporter = await testPrisma.user.create({
      data: {
        email: `reporter-${Date.now()}@carelink.test`,
        name: "Reporter",
        role: "PATIENT",
      },
    });
    const complaint = await testPrisma.complaint.create({
      data: {
        reporterId: reporter.id,
        type: "SUPPORT",
        subject: "Test complaint",
        body: "Details",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: reporter.id, email: reporter.email, role: "PATIENT" },
    } as never);

    const res = await resolveComplaint(
      new Request("http://localhost/api/admin/complaints/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      }),
      { params: Promise.resolve({ complaintId: complaint.id }) },
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 403 for non-admin sessions on verification decisions", async () => {
    const giver = await testPrisma.user.create({
      data: {
        email: `giver-${Date.now()}@carelink.test`,
        name: "Care Giver",
        role: "CAREGIVER",
      },
    });
    const profile = await testPrisma.caregiverProfile.create({
      data: {
        userId: giver.id,
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
        verificationStatus: "UNDER_REVIEW",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: giver.id, email: giver.email, role: "CAREGIVER" },
    } as never);

    const res = await verificationDecision(
      new Request("http://localhost/api/admin/providers/x/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ caregiverId: profile.id }) },
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("allows users with ADMIN role through requireAdminSession", async () => {
    const admin = await testPrisma.user.create({
      data: {
        email: `admin-role-${Date.now()}@carelink.test`,
        name: "Role Admin",
        role: "ADMIN",
      },
    });

    const allowed = await requireAdminSession({
      user: { id: admin.id, email: admin.email, role: "ADMIN" },
    } as never);
    expect(allowed).toEqual({ ok: true, userId: admin.id });
    expect(await isAdminUser(admin.id)).toBe(true);
  });
});

describeIntegration("admin audit log", () => {
  beforeEach(async () => {
    await resetTestData();
    vi.clearAllMocks();
  });

  it("records verification, complaint, and erasure events", async () => {
    const admin = await testPrisma.user.create({
      data: {
        email: `admin-${Date.now()}@carelink.test`,
        name: "Ops Admin",
        role: "ADMIN",
      },
    });
    const reporter = await testPrisma.user.create({
      data: {
        email: `erase-${Date.now()}@carelink.test`,
        name: "Erase Me",
        role: "PATIENT",
      },
    });
    const giver = await testPrisma.user.create({
      data: {
        email: `giver-${Date.now()}@carelink.test`,
        name: "Care Giver",
        role: "CAREGIVER",
      },
    });
    const profile = await testPrisma.caregiverProfile.create({
      data: {
        userId: giver.id,
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
        verificationStatus: "UNDER_REVIEW",
      },
    });
    const complaint = await testPrisma.complaint.create({
      data: {
        reporterId: reporter.id,
        type: "SUPPORT",
        subject: "Help",
        body: "Need help",
      },
    });

    vi.mocked(auth).mockResolvedValue({
      user: { id: admin.id, email: admin.email, role: "ADMIN" },
    } as never);

    const verificationRes = await verificationDecision(
      new Request("http://localhost/api/admin/providers/x/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", note: "Looks good" }),
      }),
      { params: Promise.resolve({ caregiverId: profile.id }) },
    );
    expect(verificationRes.status).toBe(200);

    const complaintRes = await resolveComplaint(
      new Request("http://localhost/api/admin/complaints/x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", adminNote: "No action needed" }),
      }),
      { params: Promise.resolve({ complaintId: complaint.id }) },
    );
    expect(complaintRes.status).toBe(200);

    vi.mocked(auth).mockResolvedValue({
      user: { id: reporter.id, email: reporter.email, role: "PATIENT" },
    } as never);

    const eraseRes = await eraseAccount(
      new Request("http://localhost/api/me/erase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE MY ACCOUNT" }),
      }),
    );
    expect(eraseRes.status).toBe(200);

    const audits = await testPrisma.adminAuditLog.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(audits).toHaveLength(3);
    expect(audits[0]).toMatchObject({
      adminUserId: admin.id,
      action: ADMIN_AUDIT_ACTIONS.verificationApproved,
      targetType: "caregiver",
      targetId: profile.id,
    });
    expect(audits[1]).toMatchObject({
      adminUserId: admin.id,
      action: ADMIN_AUDIT_ACTIONS.complaintDismissed,
      targetType: "complaint",
      targetId: complaint.id,
    });
    expect(audits[2]).toMatchObject({
      adminUserId: null,
      action: ADMIN_AUDIT_ACTIONS.accountErasure,
      targetType: "user",
      targetId: reporter.id,
    });
  });
});
