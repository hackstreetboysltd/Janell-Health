import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { type PaidPlanId } from "@/lib/membership";
import { applyMembershipPlan } from "@/lib/membership-billing";
import { mpesaMockEnabled } from "@/lib/mpesa-config";

const schema = z.object({
  plan: z.enum(["professional", "featured"]),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  if (!mpesaMockEnabled()) {
    return NextResponse.json(
      { error: "Membership billing not configured. Contact support." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const planId = parsed.data.plan as PaidPlanId;

  const result = await applyMembershipPlan({
    caregiverId: profile.id,
    planId,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  return NextResponse.json(result);
}
