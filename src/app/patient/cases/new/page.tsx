import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { NewCaseForm, type NewCaseInitial } from "@/components/new-case-form";
import { MobileNav } from "@/components/mobile-nav";
import { prisma } from "@/lib/prisma";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ repeat?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/patient");

  const params = await searchParams;
  let initial: NewCaseInitial | undefined;

  if (params.repeat) {
    const prior = await prisma.booking.findFirst({
      where: {
        id: params.repeat,
        patientId: session.user.id,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      include: { case: true, caregiver: true },
    });
    if (prior) {
      initial = {
        category: prior.case.category,
        ageBand: prior.case.ageBand,
        careSummary: prior.case.careSummary,
        visitAddress: prior.visitAddress,
        visitPlaceId: prior.case.visitPlaceId ?? undefined,
        visitLat: prior.visitLat,
        visitLng: prior.visitLng,
        durationMinutes: prior.durationMinutes,
        genderPreference: prior.case.genderPreference,
        specialRequirements: prior.case.specialRequirements,
        repeatCaregiverName: prior.caregiver.fullName,
      };
    }
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pt-4 pb-[4.5rem]"
    >
      <AppHeader />
      <NewCaseForm className="mt-4 min-h-0 flex-1" initial={initial} />
      <MobileNav role="patient" />
    </main>
  );
}
