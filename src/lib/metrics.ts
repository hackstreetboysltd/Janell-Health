import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/commission";

export type LaunchMetrics = {
  bookingsThisWeek: number;
  repeatBookingRatePct: number;
  avgBookingValue: number;
  cancellationRatePct: number;
  csatAverage: number;
  csatCount: number;
  avgAcceptanceMinutes: number;
  acceptanceSampleSize: number;
};

export async function getLaunchMetrics(): Promise<LaunchMetrics> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const [
    bookingsThisWeek,
    allBookings,
    cancelledCount,
    valueAgg,
    reviews,
    acceptedBookings,
    completedByPatient,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        createdAt: { gte: weekAgo },
        status: { in: ["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"] },
      },
    }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      _avg: { grossAmount: true },
    }),
    prisma.review.aggregate({
      where: { hidden: false },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.booking.findMany({
      where: {
        status: {
          in: ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "DECLINED"],
        },
      },
      select: { createdAt: true, updatedAt: true, status: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.groupBy({
      by: ["patientId"],
      where: { status: "COMPLETED" },
      _count: { id: true },
    }),
  ]);

  const patientsWithRepeat = completedByPatient.filter((g) => g._count.id >= 2).length;
  const patientsWithCompleted = completedByPatient.length;
  const repeatBookingRatePct =
    patientsWithCompleted === 0
      ? 0
      : Math.round((patientsWithRepeat / patientsWithCompleted) * 100);

  const cancellationRatePct =
    allBookings === 0 ? 0 : Math.round((cancelledCount / allBookings) * 100);

  const acceptanceDeltas = acceptedBookings
    .filter((b) => b.status !== "PENDING_PROVIDER")
    .map((b) => (b.updatedAt.getTime() - b.createdAt.getTime()) / 60_000)
    .filter((m) => m >= 0 && m < 60 * 24);

  const avgAcceptanceMinutes =
    acceptanceDeltas.length === 0
      ? 0
      : Math.round(
          acceptanceDeltas.reduce((a, b) => a + b, 0) / acceptanceDeltas.length,
        );

  return {
    bookingsThisWeek,
    repeatBookingRatePct,
    avgBookingValue: Math.round(valueAgg._avg.grossAmount ?? 0),
    cancellationRatePct,
    csatAverage: Math.round((reviews._avg.rating ?? 0) * 10) / 10,
    csatCount: reviews._count.id,
    avgAcceptanceMinutes,
    acceptanceSampleSize: acceptanceDeltas.length,
  };
}

export function formatMetricValue(key: keyof LaunchMetrics, metrics: LaunchMetrics): string {
  switch (key) {
    case "avgBookingValue":
      return formatKes(metrics.avgBookingValue);
    case "repeatBookingRatePct":
    case "cancellationRatePct":
      return `${metrics[key]}%`;
    case "csatAverage":
      return metrics.csatCount === 0 ? "—" : `${metrics.csatAverage} / 5`;
    case "avgAcceptanceMinutes":
      return metrics.acceptanceSampleSize === 0
        ? "—"
        : `${metrics.avgAcceptanceMinutes} min`;
    default:
      return String(metrics[key]);
  }
}
