import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  body: z.string().min(10).max(8000),
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
    return NextResponse.json({ error: "Note too short" }, { status: 400 });
  }

  const { bookingId } = await context.params;
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      caregiver: { userId: session.user.id },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const body = parsed.data.body.trim();
  const existing = await prisma.visitNote.findUnique({
    where: { bookingId },
  });

  const note = existing
    ? await prisma.visitNote.update({
        where: { id: existing.id },
        data: { body },
      })
    : await prisma.visitNote.create({
        data: {
          bookingId,
          caregiverId: booking.caregiverId,
          body,
        },
      });

  return NextResponse.json({ id: note.id });
}
