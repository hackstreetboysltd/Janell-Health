import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CareRequestCard } from "@/components/care-request-card";
import { EmptyState } from "@/components/empty-state";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleAddLink, ModuleHeading } from "@/components/module-heading";

export default async function PatientHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role === "CAREGIVER") redirect("/giver");
  if (!session.user.onboarded) redirect("/onboarding/patient");

  const cases = await prisma.case.findMany({
    where: { patientId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { booking: true },
  });

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8"
    >
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading
        trailing={
          <ModuleAddLink
            href="/patient/cases/new"
            label="New care request"
          />
        }
      >
        Your care requests
      </ModuleHeading>

      <div className="mt-6 flex flex-col gap-3">
        {cases.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Start by telling us what care you need at home — we'll match you with verified professionals nearby."
            action={{ href: "/patient/cases/new", label: "Create care request" }}
          />
        ) : (
          cases.map((c, index) => (
            <CareRequestCard
              key={c.id}
              id={c.id}
              category={c.category}
              careSummary={c.careSummary}
              wantHtml={c.wantHtml}
              scheduledAt={c.scheduledAt}
              durationMinutes={c.durationMinutes}
              visitAddress={c.visitAddress}
              services={c.services}
              createdAt={c.createdAt}
              caseStatus={c.status}
              booking={c.booking}
              index={index}
            />
          ))
        )}
      </div>
      <MobileNav role="patient" />
    </main>
  );
}
