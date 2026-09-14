import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";

const schema = z.object({
  bookingId: z.string(),
  phone: z.string().min(9),
});

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: parsed.data.bookingId,
      patientId: session.user.id,
      status: "PENDING_PAYMENT",
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  try {
    const stk = await initiateStkPush({
      phone: parsed.data.phone,
      amount: booking.grossAmount,
      accountReference: booking.id.slice(0, 12),
      description: "Janell Health",
    });

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        mpesaPhone: parsed.data.phone,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
        status: "PENDING",
      },
      update: {
        mpesaPhone: parsed.data.phone,
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      mock: Boolean(stk.mock),
      checkoutRequestId: stk.checkoutRequestId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "STK failed" },
      { status: 400 },
    );
  }
}
