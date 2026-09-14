import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES: BookingStatus[] = [
  "PENDING_PROVIDER",
  "PENDING_PAYMENT",
  "CONFIRMED",
];

export function visitEndTime(scheduledAt: Date, durationMinutes: number): Date {
  return new Date(scheduledAt.getTime() + durationMinutes * 60_000);
}

export function visitsOverlap(
  aStart: Date,
  aDurationMinutes: number,
  bStart: Date,
  bDurationMinutes: number,
): boolean {
  const aEnd = visitEndTime(aStart, aDurationMinutes);
  const bEnd = visitEndTime(bStart, bDurationMinutes);
  return aStart < bEnd && aEnd > bStart;
}

function minutesFromTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function findBookingConflict(
  caregiverId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludeBookingId?: string,
): Promise<{ id: string; scheduledAt: Date } | null> {
  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      caregiverId,
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { gte: dayStart, lt: dayEnd },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, scheduledAt: true, durationMinutes: true },
  });

  for (const b of bookings) {
    if (
      visitsOverlap(
        scheduledAt,
        durationMinutes,
        b.scheduledAt,
        b.durationMinutes,
      )
    ) {
      return { id: b.id, scheduledAt: b.scheduledAt };
    }
  }
  return null;
}

export async function isBlockedByTimeOff(
  caregiverId: string,
  scheduledAt: Date,
  durationMinutes: number,
): Promise<boolean> {
  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);

  const blocks = await prisma.providerTimeOff.findMany({
    where: {
      caregiverId,
      date: dayStart,
    },
  });

  if (blocks.length === 0) return false;

  const visitStart = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const visitEnd = visitStart + durationMinutes;

  return blocks.some((block) => {
    const blockStart = minutesFromTime(block.startTime);
    const blockEnd = minutesFromTime(block.endTime);
    return visitStart < blockEnd && visitEnd > blockStart;
  });
}

export function bookingConflictMessage(scheduledAt: Date): string {
  return `This professional already has a visit at ${scheduledAt.toLocaleString("en-KE", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  })}. Pick another time or provider.`;
}

export function timeOffBlockMessage(): string {
  return "This professional marked that time as unavailable. Pick another slot or provider.";
}
