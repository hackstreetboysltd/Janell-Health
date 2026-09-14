import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

type RouteContext = { params: Promise<{ bookingId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await context.params;
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      patientId: session.user.id,
      status: "CONFIRMED",
    },
    include: {
      caregiver: { include: { user: true } },
      patient: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    }),
    prisma.case.update({
      where: { id: booking.caseId },
      data: { status: "COMPLETED" },
    }),
  ]);

  await notifyUser({
    userId: session.user.id,
    phone: session.user.phone,
    bookingId,
    type: "REVIEW_REMINDER",
    title: "How was your visit?",
    body: `Rate ${booking.caregiver.fullName} to help other families choose trusted care.`,
  });

  return NextResponse.json({ ok: true, status: "COMPLETED" });
}
