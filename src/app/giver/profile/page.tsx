import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { getRegionById } from "@/lib/regions";
import { MobileNav } from "@/components/mobile-nav";
import { GiverProfileEditor } from "@/components/giver-profile-editor";

export default async function GiverProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { caregiverProfile: true },
  });
  const profile = user?.caregiverProfile;
  if (!profile) redirect("/onboarding/giver");

  const regionName = getRegionById(profile.region)?.name ?? profile.region;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">Your profile</h1>
      <GiverProfileEditor
        initial={{
          fullName: profile.fullName,
          phone: user.phone || session.user.phone || "",
          nationalId: profile.nationalId,
          profession: profile.profession,
          professionId: profile.professionId,
          address: profile.address,
          placeId: profile.placeId || "",
          lat: profile.lat,
          lng: profile.lng,
          regionName,
          rateType: profile.rateType,
          rateKes: profile.rateKes,
          availableWeekdaysStart: profile.availableWeekdaysStart,
          availableWeekdaysEnd: profile.availableWeekdaysEnd,
          availableWeekendsStart: profile.availableWeekendsStart,
          availableWeekendsEnd: profile.availableWeekendsEnd,
        }}
      />
      <MobileNav role="giver" />
    </main>
  );
}
