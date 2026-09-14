import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { observeApiRequest } from "@/lib/api-observability";
import { enforceUserApiRateLimit } from "@/lib/api-rate-limit";
import { logBookingFunnelEvent } from "@/lib/booking-funnel";
import { prisma } from "@/lib/prisma";
import { splitCommission } from "@/lib/commission";
import { verificationRequired } from "@/lib/feature-flags";
import { calculateBookingGross } from "@/lib/booking-amount";
import {
  availabilityErrorMessage,
  isWithinAvailability,
} from "@/lib/availability";
import {
  bookingConflictMessage,
  findBookingConflict,
  isBlockedByTimeOff,
  timeOffBlockMessage,
} from "@/lib/booking-conflicts";
import { notifyUser } from "@/lib/notify";
import { providerOffersAnyService, requestedServiceIds } from "@/lib/services";
import type { GenderPreference, Profession } from "@prisma/client";

const schema = z.object({
  caseId: z.string().min(1),
  caregiverId: z.string().min(1),
});

function matchesGenderPreference(
  caregiverProfession: Profession,
  preference: GenderPreference,
): boolean {
  if (preference === "NO_PREFERENCE") return true;
  // Gender not stored on profile yet — do not block; preference is informational.
  void caregiverProfession;
  void preference;
  return true;
}

export async function POST(req: Request) {
  return observeApiRequest(req, postHandler);
}

async function postHandler(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimited = await enforceUserApiRateLimit(
    session.user.id,
    "bookingCreate",
  );
  if (userLimited) return userLimited;

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
    include: { user: true },
  });
  if (!caregiver?.isActive) {
    return NextResponse.json({ error: "Giver unavailable" }, { status: 404 });
  }
  if (
    verificationRequired() &&
    caregiver.verificationStatus !== "APPROVED"
  ) {
    return NextResponse.json({ error: "Giver unavailable" }, { status: 404 });
  }

  if (
    !isWithinAvailability(caseRecord.scheduledAt, caregiver)
  ) {
    return NextResponse.json(
      { error: availabilityErrorMessage(caseRecord.scheduledAt) },
      { status: 400 },
    );
  }

  const requestedServices = requestedServiceIds(caseRecord.services);
  if (
    !providerOffersAnyService(caregiver.specializations, requestedServices)
  ) {
    return NextResponse.json(
      { error: "This professional does not offer the requested services." },
      { status: 400 },
    );
  }

  if (
    await isBlockedByTimeOff(
      caregiver.id,
      caseRecord.scheduledAt,
      caseRecord.durationMinutes,
    )
  ) {
    return NextResponse.json({ error: timeOffBlockMessage() }, { status: 400 });
  }

  const conflict = await findBookingConflict(
    caregiver.id,
    caseRecord.scheduledAt,
    caseRecord.durationMinutes,
  );
  if (conflict) {
    return NextResponse.json(
      { error: bookingConflictMessage(conflict.scheduledAt) },
      { status: 400 },
    );
  }

  if (
    !matchesGenderPreference(
      caregiver.profession,
      caseRecord.genderPreference,
    )
  ) {
    return NextResponse.json(
      { error: "This professional does not match your preference." },
      { status: 400 },
    );
  }

  const existing = await prisma.booking.findUnique({
    where: { caseId: caseRecord.id },
  });
  if (existing) {
    if (existing.status === "DECLINED") {
      await prisma.booking.delete({ where: { id: existing.id } });
    } else {
      return NextResponse.json({ id: existing.id, status: existing.status });
    }
  }

  const grossAmount = calculateBookingGross(
    caregiver.rateType,
    caregiver.rateKes,
    caseRecord.durationMinutes,
  );
  const { platformFee, caregiverPayout } = splitCommission(grossAmount);

  const booking = await prisma.booking.create({
    data: {
      caseId: caseRecord.id,
      caregiverId: caregiver.id,
      patientId: session.user.id,
      grossAmount,
      platformFee,
      caregiverPayout,
      scheduledAt: caseRecord.scheduledAt,
      durationMinutes: caseRecord.durationMinutes,
      visitAddress: caseRecord.visitAddress,
      visitLat: caseRecord.visitLat,
      visitLng: caseRecord.visitLng,
      status: "PENDING_PROVIDER",
    },
  });

  await notifyUser({
    userId: caregiver.userId,
    phone: caregiver.user.phone,
    bookingId: booking.id,
    type: "BOOKING_REQUEST",
    title: "New booking request",
    body: `${session.user.name || "A patient"} requested a visit on ${caseRecord.scheduledAt.toLocaleString("en-KE")}. Review and accept or decline.`,
  });

  logBookingFunnelEvent("created", {
    bookingId: booking.id,
    status: booking.status,
    caregiverId: caregiver.id,
  });

  return NextResponse.json({ id: booking.id, status: booking.status });
}
