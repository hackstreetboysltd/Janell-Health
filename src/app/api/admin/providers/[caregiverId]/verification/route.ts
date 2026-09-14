import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { requireAdminSession } from "@/lib/access/admin";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["approve", "reject", "suspend"]),
  note: z.string().max(2000).optional(),
});

type RouteContext = { params: Promise<{ caregiverId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { caregiverId } = await context.params;
  const profile = await prisma.caregiverProfile.findUnique({
    where: { id: caregiverId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { action, note } = parsed.data;

  if (action === "approve") {
    await prisma.$transaction([
      prisma.caregiverProfile.update({
        where: { id: caregiverId },
        data: {
          verificationStatus: "APPROVED",
          verificationNote: note ?? null,
          isActive: true,
        },
      }),
      prisma.verificationAudit.create({
        data: {
          caregiverId,
          adminUserId: admin.userId,
          action: "APPROVED",
          note: note ?? null,
        },
      }),
    ]);
    await recordAdminAudit({
      adminUserId: admin.userId,
      action: ADMIN_AUDIT_ACTIONS.verificationApproved,
      targetType: "caregiver",
      targetId: caregiverId,
      note: note ?? null,
    });
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  if (action === "reject") {
    await prisma.$transaction([
      prisma.caregiverProfile.update({
        where: { id: caregiverId },
        data: {
          verificationStatus: "REJECTED",
          verificationNote:
            note?.trim() ||
            "Application rejected. Update your documents and submit again.",
          isActive: false,
        },
      }),
      prisma.verificationAudit.create({
        data: {
          caregiverId,
          adminUserId: admin.userId,
          action: "REJECTED",
          note: note ?? null,
        },
      }),
    ]);
    await recordAdminAudit({
      adminUserId: admin.userId,
      action: ADMIN_AUDIT_ACTIONS.verificationRejected,
      targetType: "caregiver",
      targetId: caregiverId,
      note: note ?? null,
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  await prisma.$transaction([
    prisma.caregiverProfile.update({
      where: { id: caregiverId },
      data: {
        verificationStatus: "SUSPENDED",
        verificationNote: note ?? "Account suspended.",
        isActive: false,
      },
    }),
    prisma.verificationAudit.create({
      data: {
        caregiverId,
        adminUserId: admin.userId,
        action: "SUSPENDED",
        note: note ?? null,
      },
    }),
  ]);

  await recordAdminAudit({
    adminUserId: admin.userId,
    action: ADMIN_AUDIT_ACTIONS.verificationSuspended,
    targetType: "caregiver",
    targetId: caregiverId,
    note: note ?? null,
  });

  return NextResponse.json({ ok: true, status: "SUSPENDED" });
}
