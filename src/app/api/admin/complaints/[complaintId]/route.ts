import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { requireAdminSession } from "@/lib/access/admin";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["resolve", "dismiss"]),
  adminNote: z.string().max(2000).optional(),
});

type RouteContext = { params: Promise<{ complaintId: string }> };

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

  const { complaintId } = await context.params;
  const status = parsed.data.action === "resolve" ? "RESOLVED" : "DISMISSED";

  await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status,
      adminNote: parsed.data.adminNote ?? null,
    },
  });

  await recordAdminAudit({
    adminUserId: admin.userId,
    action:
      status === "RESOLVED"
        ? ADMIN_AUDIT_ACTIONS.complaintResolved
        : ADMIN_AUDIT_ACTIONS.complaintDismissed,
    targetType: "complaint",
    targetId: complaintId,
    note: parsed.data.adminNote ?? null,
  });

  return NextResponse.json({ ok: true, status });
}
