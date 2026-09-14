import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleHeading } from "@/components/module-heading";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";
import { requestedServiceIds, serviceLabel } from "@/lib/services";

function bookingStatusLabel(status: string | undefined): string {
  switch (status) {
    case "PENDING_PROVIDER":
      return "Awaiting professional";
    case "PENDING_PAYMENT":
      return "Pay to confirm";
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "DECLINED":
      return "Declined";
    default:
      return status ?? "";
  }
}

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
      <AppHeader />
      <ModuleHeading>Your care requests</ModuleHeading>
      <p className="mt-2 text-ink/60">
        Describe what you need, pick a verified professional, and pay after they
        accept.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {cases.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Start by telling us what care you need at home — we'll match you with verified professionals nearby."
            action={{ href: "/patient/cases/new", label: "Create care request" }}
          />
        ) : (
          cases.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-mist bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink/70">
                  {categoryLabel(c.category)}
                </p>
                <time className="font-mono text-xs text-ink/40">
                  {c.createdAt.toLocaleDateString("en-KE")}
                </time>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink/80">
                {c.careSummary || c.wantHtml.replace(/<[^>]+>/g, "")}
              </p>
              <p className="mt-2 text-xs text-ink/50">
                {formatScheduledAt(c.scheduledAt)} ·{" "}
                {formatDuration(c.durationMinutes)} · {c.visitAddress}
              </p>
              {requestedServiceIds(c.services).length > 0 ? (
                <p className="mt-1 text-xs text-ink/45">
                  {requestedServiceIds(c.services)
                    .map(serviceLabel)
                    .join(" · ")}
                </p>
              ) : null}
              {c.booking ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-sage">
                  {bookingStatusLabel(c.booking.status)}
                </p>
              ) : null}
              {c.status === "OPEN" && !c.booking ? (
                <Link
                  href={`/patient/find?caseId=${c.id}`}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-sage"
                >
                  Find verified professionals →
                </Link>
              ) : c.booking ? (
                <Link
                  href={`/patient/bookings/${c.booking.id}`}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-sage"
                >
                  View request →
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>

      <Link
        href="/patient/cases/new"
        className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-sage font-semibold text-white"
      >
        New care request
      </Link>
      <MobileNav role="patient" />
    </main>
  );
}
