import { prisma } from "@/lib/prisma";

export async function confirmBookingPayment(
  bookingId: string,
  opts: { resultCode: number; raw?: string },
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      caregiver: { include: { user: true } },
      patient: true,
      case: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  if (opts.resultCode !== 0) {
    await prisma.payment.updateMany({
      where: { bookingId },
      data: {
        status: "FAILED",
        resultCode: opts.resultCode,
        rawCallback: opts.raw,
      },
    });
    return { confirmed: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { bookingId },
      data: {
        status: "SUCCESS",
        resultCode: 0,
        rawCallback: opts.raw,
      },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
    await tx.case.update({
      where: { id: booking.caseId },
      data: { status: "BOOKED" },
    });
    await tx.notification.create({
      data: {
        userId: booking.caregiver.userId,
        bookingId: booking.id,
        type: "BOOKING_CONFIRMED",
        title: "New booking confirmed",
        body: `${booking.patient.name || "A patient"} booked you. Call them first on ${booking.patient.phone || "their number"}.`,
      },
    });
  });

  return { confirmed: true };
}
