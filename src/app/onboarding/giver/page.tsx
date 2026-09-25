import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { GiverOnboardingForm } from "@/components/giver-onboarding-form";
import { prisma } from "@/lib/prisma";
import { roleForPortalProfile } from "@/lib/portal-role";

export default async function GiverOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const existing = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    const nextRole = roleForPortalProfile(session.user.role, "CAREGIVER");
    if (session.user.role !== nextRole) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: nextRole },
      });
    }
    redirect("/giver");
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pt-4"
    >
      <AppHeader />
      <GiverOnboardingForm
        className="mt-4 min-h-0 flex-1"
        defaultName={session.user.name || ""}
        defaultPhone={session.user.phone || ""}
      />
    </main>
  );
}
