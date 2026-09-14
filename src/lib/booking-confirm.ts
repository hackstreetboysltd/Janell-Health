import { prisma } from "@/lib/prisma";
import { logBookingFunnelEvent } from "@/lib/booking-funnel";
import { notifyUser } from "@/lib/notify";

export type ConfirmPaymentResult = {
  confirmed: boolean;
  alreadyProcessed?: boolean;
};

export async function confirmBookingPayment(
  bookingId: string,
  opts: { resultCode: number; raw?: string },
): Promise<ConfirmPaymentResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      caregiver: { include: { user: true } },
      patient: true,
      case: true,
      payment: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  const payment = booking.payment;

  if (payment?.status === "SUCCESS" || booking.status === "CONFIRMED") {
    return { confirmed: true, alreadyProcessed: true };
  }

  if (opts.resultCode !== 0) {
    if (payment?.status === "FAILED") {
      return { confirmed: false, alreadyProcessed: true };
    }
    if (payment?.status === "PENDING") {
      await prisma.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: {
          status: "FAILED",
          resultCode: opts.resultCode,
          rawCallback: opts.raw,
        },
      });
      logBookingFunnelEvent("payment_failed", {
        bookingId,
        resultCode: opts.resultCode,
      });
    }
    return { confirmed: false };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    throw new Error("Booking is not awaiting payment");
  }

  const applied = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, caseId: true },
    });
    if (!current) return false;
    if (current.status === "CONFIRMED") return false;
    if (current.status !== "PENDING_PAYMENT") {
      throw new Error("Booking is not awaiting payment");
    }

    const paymentUpdate = await tx.payment.updateMany({
      where: { bookingId, status: "PENDING" },
      data: {
        status: "SUCCESS",
        resultCode: 0,
        rawCallback: opts.raw,
      },
    });
    if (paymentUpdate.count === 0) return false;

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
    await tx.case.update({
      where: { id: current.caseId },
      data: { status: "BOOKED" },
    });
    return true;
  });

  if (!applied) {
    return { confirmed: true, alreadyProcessed: true };
  }

  await notifyUser({
    userId: booking.caregiver.userId,
    phone: booking.caregiver.user.phone,
    bookingId: booking.id,
    type: "BOOKING_CONFIRMED",
    title: "New booking confirmed",
    body: `${booking.patient.name || "A patient"} paid. Call them first on ${booking.patient.phone || "their number"}.`,
  });

  await notifyUser({
    userId: booking.patientId,
    phone: booking.patient.phone,
    bookingId: booking.id,
    type: "BOOKING_CONFIRMED",
    title: "Payment confirmed",
    body: `Your visit with ${booking.caregiver.fullName} is confirmed.`,
  });

  logBookingFunnelEvent("payment_confirmed", {
    bookingId,
    status: "CONFIRMED",
  });

  return { confirmed: true };
}
