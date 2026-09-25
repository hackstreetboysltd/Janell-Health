import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { MembershipPlans } from "@/components/membership-plans";
import { ModuleHeading } from "@/components/module-heading";
import { effectiveTier, isFeatured } from "@/lib/membership";
import { mpesaMockEnabled } from "@/lib/mpesa-config";

export default async function GiverMembershipPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const tier = effectiveTier(profile.membershipTier, profile.membershipUntil);
  const featuredActive = isFeatured(profile.featuredUntil);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading>Membership</ModuleHeading>

      <MembershipPlans
        currentTier={tier}
        membershipUntil={profile.membershipUntil?.toISOString() ?? null}
        featuredUntil={profile.featuredUntil?.toISOString() ?? null}
        featuredActive={featuredActive}
        mockBilling={mpesaMockEnabled()}
      />

      <MobileNav role="giver" />
    </main>
  );
}
