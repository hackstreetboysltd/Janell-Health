import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { PatientOnboardingForm } from "@/components/patient-onboarding-form";
import { prisma } from "@/lib/prisma";

export default async function PatientOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const existing = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    if (session.user.role !== "PATIENT") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "PATIENT" },
      });
    }
    redirect("/patient");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-36 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">Patient profile</h1>
      <p className="mt-2 text-ink/60">Tell us about you so givers can prepare.</p>
      <div className="mt-8">
        <PatientOnboardingForm
          defaultName={session.user.name || ""}
          defaultPhone={session.user.phone || ""}
        />
      </div>
    </main>
  );
}
