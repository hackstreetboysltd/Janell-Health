import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type BookingFunnelSnapshot = {
  pendingProvider: number;
  pendingPayment: number;
  confirmed: number;
  completed: number;
  declined: number;
  cancelled: number;
  paymentsPending: number;
  paymentsFailed: number;
  paymentsSuccess: number;
  week: {
    created: number;
    paid: number;
    completed: number;
  };
};

export async function getBookingFunnelSnapshot(): Promise<BookingFunnelSnapshot> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    pendingProvider,
    pendingPayment,
    confirmed,
    completed,
    declined,
    cancelled,
    paymentsPending,
    paymentsFailed,
    paymentsSuccess,
    createdWeek,
    paidWeek,
    completedWeek,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: "PENDING_PROVIDER" } }),
    prisma.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "DECLINED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.count({ where: { status: "SUCCESS" } }),
    prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.booking.count({
      where: {
        updatedAt: { gte: weekAgo },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
    prisma.booking.count({
      where: { updatedAt: { gte: weekAgo }, status: "COMPLETED" },
    }),
  ]);

  return {
    pendingProvider,
    pendingPayment,
    confirmed,
    completed,
    declined,
    cancelled,
    paymentsPending,
    paymentsFailed,
    paymentsSuccess,
    week: {
      created: createdWeek,
      paid: paidWeek,
      completed: completedWeek,
    },
  };
}

/** Structured log for booking lifecycle transitions (grep / log drain friendly). */
export function logBookingFunnelEvent(
  event: string,
  fields: Record<string, unknown>,
) {
  logger.info(`booking.funnel.${event}`, fields);
}
