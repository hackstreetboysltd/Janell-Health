import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { professionsForCategory } from "@/lib/care-categories";
import { caregiverLocationLabel, getRegionById, haversineKm } from "@/lib/regions";
import { isWithinAvailability } from "@/lib/availability";
import type { MapCaregiver } from "@/components/caregiver-map";
import { FindMapClient } from "@/components/find-map-client";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { searchableCaregiverWhere } from "@/lib/verification";
import { getCaregiverRatingsMap } from "@/lib/notify";
import {
  providerOffersAnyService,
  requestedServiceIds,
} from "@/lib/services";
import { effectiveTier, isFeatured } from "@/lib/membership";

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/patient");

  const params = await searchParams;
  if (!params.caseId) redirect("/patient/cases/new");

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: params.caseId,
      patientId: session.user.id,
      status: "OPEN",
    },
  });
  if (!caseRecord) redirect("/patient");

  const origin = { lat: caseRecord.visitLat, lng: caseRecord.visitLng };
  const professionFilter = professionsForCategory(caseRecord.category);
  const requestedServices = requestedServiceIds(caseRecord.services);

  const profiles = await prisma.caregiverProfile.findMany({
    where: {
      ...searchableCaregiverWhere(),
      ...(professionFilter
        ? { profession: { in: professionFilter } }
        : {}),
    },
  });

  const filtered = profiles.filter(
    (p) =>
      isWithinAvailability(caseRecord.scheduledAt, p) &&
      providerOffersAnyService(p.specializations, requestedServices),
  );
  const ratingsMap = await getCaregiverRatingsMap(
    filtered.map((p) => p.id),
  );

  const caregivers: MapCaregiver[] = filtered
    .map((p) => {
      const regionMeta = getRegionById(p.region);
      const regionName = regionMeta?.name ?? p.region;
      const rating = ratingsMap.get(p.id) ?? { average: 0, count: 0 };
      const tier = effectiveTier(p.membershipTier, p.membershipUntil);
      return {
        id: p.id,
        fullName: p.fullName,
        profession: p.profession,
        verificationStatus: p.verificationStatus,
        membershipTier: tier,
        featured: isFeatured(p.featuredUntil),
        yearsExperience: p.yearsExperience,
        bio: p.bio,
        ratingAverage: rating.average,
        ratingCount: rating.count,
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
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.membershipTier !== b.membershipTier) {
        return a.membershipTier === "PROFESSIONAL" ? -1 : 1;
      }
      return a.distanceKm - b.distanceKm;
    });

  return (
    <div id="main-content" className="relative flex min-h-dvh flex-col">
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
