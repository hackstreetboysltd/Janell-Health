import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
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
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const { bookingId } = await context.params;
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      patientId: session.user.id,
      status: "COMPLETED",
    },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "Complete the visit before reviewing" },
      { status: 404 },
    );
  }

  const existing = await prisma.review.findUnique({
    where: { bookingId },
  });
  if (existing) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      bookingId,
      caregiverId: booking.caregiverId,
      patientId: session.user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json({ id: review.id });
}
