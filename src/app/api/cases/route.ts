import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits, enforceUserApiRateLimit } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { isWithinNairobiBounds } from "@/lib/regions";
import { INSTITUTION_COOKIE } from "@/lib/referral";

const schema = z.object({
  category: z.enum([
    "HOME_NURSING",
    "CAREGIVER",
    "ELDERLY_CARE",
    "POST_HOSPITAL",
    "WOUND_CARE",
    "OTHER",
  ]),
  ageBand: z.enum(["CHILD", "ADULT", "ELDERLY"]),
  careSummary: z.string().min(10).max(4000),
  visitAddress: z.string().min(3),
  visitPlaceId: z.string().min(2),
  visitLat: z.number(),
  visitLng: z.number(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(60).max(720),
  genderPreference: z.enum(["NO_PREFERENCE", "FEMALE", "MALE"]),
  specialRequirements: z.string().max(2000).optional(),
  services: z.array(z.string()).max(20).optional(),
});

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

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
    return NextResponse.json(
      { error: "Check all required fields" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (!isWithinNairobiBounds(data.visitLat, data.visitLng)) {
    return NextResponse.json(
      { error: "Visit location must be within the Nairobi area" },
      { status: 400 },
    );
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (scheduledAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Visit must be scheduled in the future" },
      { status: 400 },
    );
  }

  const wantHtml = `<p>${data.careSummary.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
  const serviceIds = [
    data.category,
    ...(data.services?.filter(Boolean) ?? []),
  ];

  let institutionId: string | undefined;
  const jar = await cookies();
  const refSlug = jar.get(INSTITUTION_COOKIE)?.value;
  if (refSlug) {
    const institution = await prisma.institution.findFirst({
      where: { slug: refSlug, isActive: true },
      select: { id: true },
    });
    institutionId = institution?.id;
  }

  const created = await prisma.case.create({
    data: {
      patientId: session.user.id,
      category: data.category,
      ageBand: data.ageBand,
      careSummary: data.careSummary,
      wantHtml,
      services: serviceIds,
      institutionId,
      visitAddress: data.visitAddress,
      visitPlaceId: data.visitPlaceId,
      visitLat: data.visitLat,
      visitLng: data.visitLng,
      scheduledAt,
      durationMinutes: data.durationMinutes,
      genderPreference: data.genderPreference,
      specialRequirements: data.specialRequirements ?? "",
    },
  });

  return NextResponse.json({ id: created.id });
}
