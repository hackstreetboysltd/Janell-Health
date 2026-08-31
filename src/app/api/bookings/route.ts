import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { splitCommission } from "@/lib/commission";

const schema = z.object({
  caseId: z.string().min(1),
  caregiverId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  }

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: parsed.data.caseId,
      patientId: session.user.id,
      status: "OPEN",
    },
  });
  if (!caseRecord) {
    return NextResponse.json({ error: "Case not available" }, { status: 404 });
  }

  const caregiver = await prisma.caregiverProfile.findUnique({
    where: { id: parsed.data.caregiverId },
  });
  if (!caregiver?.isActive) {
    return NextResponse.json({ error: "Giver unavailable" }, { status: 404 });
  }

  const existing = await prisma.booking.findUnique({
    where: { caseId: caseRecord.id },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  const grossAmount = caregiver.rateKes;
  const { platformFee, caregiverPayout } = splitCommission(grossAmount);

  const booking = await prisma.booking.create({
    data: {
      caseId: caseRecord.id,
      caregiverId: caregiver.id,
      patientId: session.user.id,
      grossAmount,
      platformFee,
      caregiverPayout,
      status: "PENDING_PAYMENT",
    },
  });

  return NextResponse.json({ id: booking.id });
}
