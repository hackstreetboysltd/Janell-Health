import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmBookingPayment } from "@/lib/booking-confirm";

type CallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
    };
  };
};

export async function POST(req: Request) {
  const body = (await req.json()) as CallbackBody;
  const cb = body.Body?.stkCallback;
  const checkoutRequestId = cb?.CheckoutRequestID;
  const resultCode = cb?.ResultCode ?? 1;

  if (checkoutRequestId) {
    const payment = await prisma.payment.findFirst({
      where: { checkoutRequestId },
    });
    if (payment) {
      await confirmBookingPayment(payment.bookingId, {
        resultCode,
        raw: JSON.stringify(body),
      });
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
