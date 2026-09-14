import type { RateType } from "@prisma/client";

export function calculateBookingGross(
  rateType: RateType,
  rateKes: number,
  durationMinutes: number,
): number {
  if (rateType === "HOURLY") {
    return Math.max(100, Math.round(rateKes * (durationMinutes / 60)));
  }
  return rateKes;
}
