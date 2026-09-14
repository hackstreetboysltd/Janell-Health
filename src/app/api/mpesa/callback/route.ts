import { NextResponse } from "next/server";
import { observeApiRequest } from "@/lib/api-observability";
import { confirmBookingPayment } from "@/lib/booking-confirm";
import { logger } from "@/lib/logger";
import { isValidMpesaCallback } from "@/lib/mpesa-config";
import { prisma } from "@/lib/prisma";

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
  return observeApiRequest(req, postHandler);
}

async function postHandler(req: Request) {
  if (!isValidMpesaCallback(req)) {
    logger.warn("mpesa.callback.forbidden");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid JSON" }, { status: 400 });
  }

  const cb = body.Body?.stkCallback;
  const checkoutRequestId = cb?.CheckoutRequestID;
  const resultCode = cb?.ResultCode ?? 1;

  if (checkoutRequestId) {
    const payment = await prisma.payment.findFirst({
      where: { checkoutRequestId },
      select: { bookingId: true, status: true },
    });
    if (payment && payment.status === "PENDING") {
      await confirmBookingPayment(payment.bookingId, {
        resultCode,
        raw: JSON.stringify(body),
      });
    }
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
