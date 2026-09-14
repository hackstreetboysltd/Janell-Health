import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { isWithinNairobiBounds, nearestRegion } from "@/lib/regions";
import { defaultServicesForProfession } from "@/lib/services";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(9),
  nationalId: z.string().min(5),
  profession: z.enum(["CAREGIVER", "NURSE"]),
  professionId: z.string().min(2),
  yearsExperience: z.number().int().min(0).max(60),
  bio: z.string().max(2000).optional(),
  address: z.string().min(3),
  placeId: z.string().min(2),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rateType: z.enum(["HOURLY", "VISIT"]),
  rateKes: z.number().int().min(100),
  availableWeekdaysStart: z.string(),
  availableWeekdaysEnd: z.string(),
  availableWeekendsStart: z.string(),
  availableWeekendsEnd: z.string(),
  specializations: z.array(z.string()).min(1).max(30).optional(),
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
    return NextResponse.json(
      { error: "Pick an exact location from the address suggestions" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (!isWithinNairobiBounds(data.lat, data.lng)) {
    return NextResponse.json(
      { error: "Location must be within the Nairobi area" },
      { status: 400 },
    );
  }
  const region = nearestRegion(data.lat, data.lng);

  const location = {
    region: region.id,
    address: data.address,
    placeId: data.placeId,
    lat: data.lat,
    lng: data.lng,
  };

  const profileData = {
    fullName: data.fullName,
    nationalId: data.nationalId,
    profession: data.profession,
    professionId: data.professionId,
    yearsExperience: data.yearsExperience,
    bio: data.bio?.trim() || "",
    specializations:
      data.specializations && data.specializations.length > 0
        ? data.specializations
        : defaultServicesForProfession(data.profession),
    ...location,
    rateType: data.rateType,
    rateKes: data.rateKes,
    availableWeekdaysStart: data.availableWeekdaysStart,
    availableWeekdaysEnd: data.availableWeekdaysEnd,
    availableWeekendsStart: data.availableWeekendsStart,
    availableWeekendsEnd: data.availableWeekendsEnd,
    verificationStatus: "PENDING" as const,
    isActive: false,
  };

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone: data.phone,
      role: "CAREGIVER",
      name: data.fullName,
      caregiverProfile: {
        upsert: {
          create: profileData,
          update: profileData,
        },
      },
    },
    include: { caregiverProfile: true },
  });

  return NextResponse.json({ ok: true, caregiverId: user.caregiverProfile?.id });
}
