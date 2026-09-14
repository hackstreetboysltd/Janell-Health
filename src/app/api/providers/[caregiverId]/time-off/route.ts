import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { findBookingConflict } from "@/lib/booking-conflicts";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().max(200).optional(),
});

type RouteContext = { params: Promise<{ caregiverId: string }> };

async function assertOwnProfile(caregiverId: string, userId: string) {
  const profile = await prisma.caregiverProfile.findFirst({
    where: { id: caregiverId, userId },
    select: { id: true },
  });
  return profile;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const profile = await assertOwnProfile(caregiverId, session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blocks = await prisma.providerTimeOff.findMany({
    where: { caregiverId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ blocks });
}

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const profile = await assertOwnProfile(caregiverId, session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid block" }, { status: 400 });
  }

  const { date, startTime, endTime, note } = parsed.data;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startM = (sh ?? 0) * 60 + (sm ?? 0);
  const endM = (eh ?? 0) * 60 + (em ?? 0);
  if (endM <= startM) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 },
    );
  }

  const blockDate = new Date(`${date}T12:00:00`);
  const scheduledAt = new Date(`${date}T${startTime}:00`);
  const durationMinutes = endM - startM;

  const conflict = await findBookingConflict(
    caregiverId,
    scheduledAt,
    durationMinutes,
  );
  if (conflict) {
    return NextResponse.json(
      { error: "A booking already exists during this window" },
      { status: 400 },
    );
  }

  const block = await prisma.providerTimeOff.create({
    data: {
      caregiverId,
      date: blockDate,
      startTime,
      endTime,
      note: note?.trim() ?? "",
    },
  });

  return NextResponse.json({ id: block.id });
}

export async function DELETE(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const profile = await assertOwnProfile(caregiverId, session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blockId = new URL(req.url).searchParams.get("blockId");
  if (!blockId) {
    return NextResponse.json({ error: "Missing blockId" }, { status: 400 });
  }

  const deleted = await prisma.providerTimeOff.deleteMany({
    where: { id: blockId, caregiverId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
