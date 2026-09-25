import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { ModuleHeading } from "@/components/module-heading";
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
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-36 pt-8"
    >
      <AppHeader />
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-sage">
        Step 1 of 1
      </p>
      <ModuleHeading wrapperClassName="mt-2">Your profile</ModuleHeading>
      <div className="onboarding-shell mt-8">
        <PatientOnboardingForm
          defaultName={session.user.name || ""}
          defaultPhone={session.user.phone || ""}
        />
      </div>
    </main>
  );
}
