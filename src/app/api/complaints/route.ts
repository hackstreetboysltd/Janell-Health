import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  type: z.enum(["REPORT_PROVIDER", "SUPPORT", "UNSAFE_SITUATION"]),
  subject: z.string().min(3).max(200),
  body: z.string().min(20).max(5000),
  bookingId: z.string().optional(),
  caregiverId: z.string().optional(),
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
    return NextResponse.json({ error: "Check your message" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        OR: [
          { patientId: session.user.id },
          { caregiver: { userId: session.user.id } },
        ],
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
  }

  const complaint = await prisma.complaint.create({
    data: {
      reporterId: session.user.id,
      bookingId: data.bookingId,
      caregiverId: data.caregiverId,
      type: data.type,
      subject: data.subject,
      body: data.body,
    },
  });

  return NextResponse.json({ id: complaint.id });
}
