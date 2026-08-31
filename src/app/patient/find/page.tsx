import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { caregiverLocationLabel, getRegionById, haversineKm, NAIROBI_CENTER } from "@/lib/regions";
import type { MapCaregiver } from "@/components/caregiver-map";
import { FindMapClient } from "@/components/find-map-client";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string; region?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/patient");

  const params = await searchParams;
  const originRegion = params.region ? getRegionById(params.region) : null;
  const origin = originRegion
    ? { lat: originRegion.lat, lng: originRegion.lng }
    : NAIROBI_CENTER;

  const profiles = await prisma.caregiverProfile.findMany({
    where: { isActive: true },
    include: { user: { select: { phone: true } } },
  });

  const caregivers: MapCaregiver[] = profiles
    .map((p) => {
      const regionMeta = getRegionById(p.region);
      const regionName = regionMeta?.name ?? p.region;
      return {
        id: p.id,
        fullName: p.fullName,
        phone: p.user.phone || "",
        profession: p.profession,
        region: p.region,
        regionName,
        address: caregiverLocationLabel(p.address, regionName),
        lat: p.lat,
        lng: p.lng,
        rateKes: p.rateKes,
        rateType: p.rateType,
        distanceKm: haversineKm(origin, { lat: p.lat, lng: p.lng }),
        availableWeekdaysStart: p.availableWeekdaysStart,
        availableWeekdaysEnd: p.availableWeekdaysEnd,
        availableWeekendsStart: p.availableWeekendsStart,
        availableWeekendsEnd: p.availableWeekendsEnd,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="absolute inset-x-0 top-0 z-[1100] px-4 pt-3">
        <div className="mx-auto max-w-lg rounded-xl border border-mist/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <AppHeader />
        </div>
      </div>
      <FindMapClient caregivers={caregivers} caseId={params.caseId} />
      <MobileNav role="patient" />
    </div>
  );
}
