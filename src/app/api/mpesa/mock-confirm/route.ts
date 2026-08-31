import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { confirmBookingPayment } from "@/lib/booking-confirm";

export async function POST(req: Request) {
  if (process.env.MPESA_MOCK !== "true") {
    return NextResponse.json({ error: "Mock disabled" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = (await req.json()) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  try {
    await confirmBookingPayment(bookingId, {
      resultCode: 0,
      raw: JSON.stringify({ mock: true }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Confirm failed" },
      { status: 400 },
    );
  }
}
