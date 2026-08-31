import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { caregiverLocationLabel, getRegionById, haversineKm, NAIROBI_CENTER } from "@/lib/regions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const regionId = searchParams.get("region");
  const originRegion = regionId ? getRegionById(regionId) : null;
  const origin = originRegion
    ? { lat: originRegion.lat, lng: originRegion.lng }
    : NAIROBI_CENTER;

  const profiles = await prisma.caregiverProfile.findMany({
    where: { isActive: true },
  });

  const caregivers = profiles
    .map((p) => {
      const regionName = getRegionById(p.region)?.name ?? p.region;
      return {
        id: p.id,
        fullName: p.fullName,
        profession: p.profession,
        region: p.region,
        regionName,
        address: caregiverLocationLabel(p.address, regionName),
        lat: p.lat,
        lng: p.lng,
        rateKes: p.rateKes,
        rateType: p.rateType,
        distanceKm: haversineKm(origin, { lat: p.lat, lng: p.lng }),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({ caregivers });
}
