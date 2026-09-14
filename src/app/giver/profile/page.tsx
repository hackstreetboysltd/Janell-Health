import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CaregiverBadgeRow } from "@/components/caregiver-badge-row";
import { ModuleHeading } from "@/components/module-heading";
import { getRegionById } from "@/lib/regions";
import { effectiveTier, isFeatured } from "@/lib/membership";
import { MobileNav } from "@/components/mobile-nav";
import { GiverProfileEditor } from "@/components/giver-profile-editor";
import { GiverVerificationPanel } from "@/components/giver-verification-panel";

export default async function GiverProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      caregiverProfile: {
        include: {
          documents: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              documentType: true,
              fileName: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  const profile = user?.caregiverProfile;
  if (!profile) redirect("/onboarding/giver");

  const regionName = getRegionById(profile.region)?.name ?? profile.region;
  const profession =
    profile.profession === "DOCTOR" ? "NURSE" : profile.profession;
  const membershipTier = effectiveTier(
    profile.membershipTier,
    profile.membershipUntil,
  );
  const featured = isFeatured(profile.featuredUntil);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8"
    >
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading
        trailing={
          <CaregiverBadgeRow
            verificationStatus={profile.verificationStatus}
            membershipTier={membershipTier}
            featured={featured}
          />
        }
      >
        Your profile
      </ModuleHeading>
      {profile.verificationStatus !== "APPROVED" ? (
        <div className="mt-4">
          <GiverVerificationPanel
            caregiverId={profile.id}
            status={profile.verificationStatus}
            note={profile.verificationNote}
            documents={profile.documents.map((d) => ({
              ...d,
              createdAt: d.createdAt.toISOString(),
            }))}
          />
        </div>
      ) : null}
      <GiverProfileEditor
        initial={{
          fullName: profile.fullName,
          phone: user.phone || session.user.phone || "",
          nationalId: profile.nationalId,
          profession,
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
          specializations: profile.specializations,
        }}
      />
      <MobileNav role="giver" />
    </main>
  );
}
