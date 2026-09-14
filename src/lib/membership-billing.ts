import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEMBERSHIP_PLANS,
  addDays,
  type PaidPlanId,
} from "@/lib/membership";

export type ApplyMembershipResult = {
  ok: true;
  plan: PaidPlanId;
  alreadyProcessed?: boolean;
};

export async function applyMembershipPlan(opts: {
  caregiverId: string;
  planId: PaidPlanId;
  idempotencyKey?: string;
}): Promise<ApplyMembershipResult> {
  if (opts.idempotencyKey) {
    const existing = await prisma.membershipPurchase.findUnique({
      where: { idempotencyKey: opts.idempotencyKey },
    });
    if (existing) {
      return {
        ok: true,
        plan: existing.plan as PaidPlanId,
        alreadyProcessed: true,
      };
    }
  }

  const profile = await prisma.caregiverProfile.findUniqueOrThrow({
    where: { id: opts.caregiverId },
  });
  const now = new Date();
  const planId = opts.planId;

  if (planId === "professional") {
    const plan = MEMBERSHIP_PLANS.professional;
    const base =
      profile.membershipUntil && profile.membershipUntil > now
        ? profile.membershipUntil
        : now;
    const membershipUntil = addDays(base, plan.days);

    try {
      await prisma.$transaction(async (tx) => {
        if (opts.idempotencyKey) {
          await tx.membershipPurchase.create({
            data: {
              caregiverId: opts.caregiverId,
              plan: planId,
              idempotencyKey: opts.idempotencyKey,
            },
          });
        }
        await tx.caregiverProfile.update({
          where: { id: opts.caregiverId },
          data: {
            membershipTier: plan.tier,
            membershipUntil,
          },
        });
      });
    } catch (error) {
      if (
        opts.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return applyMembershipPlan(opts);
      }
      throw error;
    }

    return { ok: true, plan: planId };
  }

  const plan = MEMBERSHIP_PLANS.featured;
  const base =
    profile.featuredUntil && profile.featuredUntil > now
      ? profile.featuredUntil
      : now;
  const featuredUntil = addDays(base, plan.days);

  try {
    await prisma.$transaction(async (tx) => {
      if (opts.idempotencyKey) {
        await tx.membershipPurchase.create({
          data: {
            caregiverId: opts.caregiverId,
            plan: planId,
            idempotencyKey: opts.idempotencyKey,
          },
        });
      }
      await tx.caregiverProfile.update({
        where: { id: opts.caregiverId },
        data: { featuredUntil },
      });
    });
  } catch (error) {
    if (
      opts.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return applyMembershipPlan(opts);
    }
    throw error;
  }

  return { ok: true, plan: planId };
}
