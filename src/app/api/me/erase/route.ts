import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "@/lib/admin-audit";
import { eraseUserAccount } from "@/lib/privacy";
import { logger } from "@/lib/logger";

const schema = z.object({
  confirm: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Send { "confirm": "DELETE MY ACCOUNT" } to erase your account.' },
      { status: 400 },
    );
  }

  const result = await eraseUserAccount(session.user.id);
  if (!result.ok) {
    if ("blocker" in result && result.blocker) {
      return NextResponse.json(
        {
          error: "Complete or cancel active bookings before deleting your account.",
          blocker: result.blocker,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: result.error ?? "Erasure failed" }, { status: 404 });
  }

  await recordAdminAudit({
    action: ADMIN_AUDIT_ACTIONS.accountErasure,
    targetType: "user",
    targetId: session.user.id,
  });

  logger.info("privacy.account_erased", { userId: session.user.id });
  return NextResponse.json({ ok: true });
}
