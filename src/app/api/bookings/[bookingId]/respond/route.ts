import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import {
  bookingConflictMessage,
  findBookingConflict,
  isBlockedByTimeOff,
  timeOffBlockMessage,
} from "@/lib/booking-conflicts";
import { isWithinAvailability, availabilityErrorMessage } from "@/lib/availability";

const schema = z.object({
  action: z.enum(["accept", "reject"]),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { bookingId } = await context.params;
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: "PENDING_PROVIDER",
      caregiver: { userId: session.user.id },
    },
    include: {
      patient: true,
      caregiver: { include: { user: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (parsed.data.action === "reject") {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: "DECLINED" },
      }),
      prisma.case.update({
        where: { id: booking.caseId },
        data: { status: "OPEN" },
      }),
    ]);

    await notifyUser({
      userId: booking.patientId,
      phone: booking.patient.phone,
      bookingId: booking.id,
      type: "BOOKING_DECLINED",
      title: "Booking declined",
      body:
        parsed.data.note?.trim() ||
        `${booking.caregiver.fullName} is unavailable for this visit. Choose another professional.`,
    });

    return NextResponse.json({ ok: true, status: "DECLINED" });
  }

  if (
    !isWithinAvailability(booking.scheduledAt, booking.caregiver)
  ) {
    return NextResponse.json(
      { error: availabilityErrorMessage(booking.scheduledAt) },
      { status: 400 },
    );
  }

  if (
    await isBlockedByTimeOff(
      booking.caregiverId,
      booking.scheduledAt,
      booking.durationMinutes,
    )
  ) {
    return NextResponse.json({ error: timeOffBlockMessage() }, { status: 400 });
  }

  const conflict = await findBookingConflict(
    booking.caregiverId,
    booking.scheduledAt,
    booking.durationMinutes,
    booking.id,
  );
  if (conflict) {
    return NextResponse.json(
      { error: bookingConflictMessage(conflict.scheduledAt) },
      { status: 400 },
    );
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PENDING_PAYMENT" },
  });

  await notifyUser({
    userId: booking.patientId,
    phone: booking.patient.phone,
    bookingId: booking.id,
    type: "BOOKING_ACCEPTED",
    title: "Booking accepted — pay to confirm",
    body: `${booking.caregiver.fullName} accepted your visit. Pay with M-Pesa to confirm.`,
  });

  return NextResponse.json({ ok: true, status: "PENDING_PAYMENT" });
}
