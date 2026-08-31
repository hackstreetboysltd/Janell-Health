import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { GiverOnboardingForm } from "@/components/giver-onboarding-form";
import { prisma } from "@/lib/prisma";

export default async function GiverOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const existing = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    if (session.user.role !== "CAREGIVER") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "CAREGIVER" },
      });
    }
    redirect("/giver");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">Healthcare giver profile</h1>
      <p className="mt-2 text-ink/60">
        Set your location, rates, and availability so patients can book you.
      </p>
      <div className="mt-8">
        <GiverOnboardingForm
          defaultName={session.user.name || ""}
          defaultPhone={session.user.phone || ""}
        />
      </div>
    </main>
  );
}
