import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [
        { patientId: session.user.id },
        { caregiver: { userId: session.user.id } },
      ],
    },
    include: { payment: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: booking.status,
    paymentStatus: booking.payment?.status ?? null,
  });
}
