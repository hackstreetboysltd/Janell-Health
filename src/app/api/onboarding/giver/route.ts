import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWithinNairobiBounds, nearestRegion } from "@/lib/regions";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(9),
  nationalId: z.string().min(5),
  profession: z.enum(["CAREGIVER", "NURSE", "DOCTOR"]),
  professionId: z.string().min(2),
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
});

export async function POST(req: Request) {
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

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone: data.phone,
      role: "CAREGIVER",
      name: data.fullName,
      caregiverProfile: {
        upsert: {
          create: {
            fullName: data.fullName,
            nationalId: data.nationalId,
            profession: data.profession,
            professionId: data.professionId,
            ...location,
            rateType: data.rateType,
            rateKes: data.rateKes,
            availableWeekdaysStart: data.availableWeekdaysStart,
            availableWeekdaysEnd: data.availableWeekdaysEnd,
            availableWeekendsStart: data.availableWeekendsStart,
            availableWeekendsEnd: data.availableWeekendsEnd,
          },
          update: {
            fullName: data.fullName,
            nationalId: data.nationalId,
            profession: data.profession,
            professionId: data.professionId,
            ...location,
            rateType: data.rateType,
            rateKes: data.rateKes,
            availableWeekdaysStart: data.availableWeekdaysStart,
            availableWeekdaysEnd: data.availableWeekdaysEnd,
            availableWeekendsStart: data.availableWeekendsStart,
            availableWeekendsEnd: data.availableWeekendsEnd,
          },
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
