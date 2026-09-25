import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleHeading } from "@/components/module-heading";
import { RecordCard } from "@/components/record-card";
import { GiverVerificationPanel } from "@/components/giver-verification-panel";
import { bookingStatusPresentation } from "@/lib/booking-status-ui";
import { formatKes } from "@/lib/commission";
import { isVerifiedStatus } from "@/lib/verification";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";

export default async function GiverHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role === "PATIENT") redirect("/patient");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
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
  });
  if (!profile) redirect("/onboarding/giver");

  const verified = isVerifiedStatus(profile.verificationStatus);

  const [pendingRequests, confirmedBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { caregiverId: profile.id, status: "PENDING_PROVIDER" },
      orderBy: { createdAt: "desc" },
      include: { patient: true, case: true },
    }),
    prisma.booking.findMany({
      where: { caregiverId: profile.id, status: "CONFIRMED" },
      orderBy: { scheduledAt: "asc" },
      include: { patient: true, case: true },
    }),
  ]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8"
    >
      <AppHeader isAdmin={session.user.isAdmin} />

      {!verified ? (
        <div className="mt-6">
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

      <ModuleHeading>Dashboard</ModuleHeading>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="dash-stat">
          <dt>Pending requests</dt>
          <dd>{pendingRequests.length}</dd>
        </div>
        <div className="dash-stat">
          <dt>Confirmed visits</dt>
          <dd>{confirmedBookings.length}</dd>
        </div>
      </dl>

      <section className="mt-8" aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="font-display text-lg">
          Requests awaiting you
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {pendingRequests.length === 0 ? (
            <EmptyState
              title="No new requests"
              description="When a family sends a booking request, it appears here for you to accept or decline."
              action={
                verified
                  ? { href: "/giver/availability", label: "Update availability" }
                  : undefined
              }
            />
          ) : (
            pendingRequests.map((b, index) => {
              const status = bookingStatusPresentation(b.status, "giver");
              return (
                <RecordCard
                  key={b.id}
                  index={index}
                  eyebrow={categoryLabel(b.case.category)}
                  title={b.patient.name || "Patient"}
                  status={status.label}
                  tone={status.tone}
                  description={b.case.careSummary || undefined}
                  meta={[
                    {
                      icon: "calendar",
                      label: "When",
                      text: `${formatScheduledAt(b.scheduledAt)} · ${formatDuration(b.durationMinutes)}`,
                    },
                    {
                      icon: "pin",
                      label: "Where",
                      text: b.visitAddress,
                    },
                  ]}
                  footerLeft={
                    <span className="font-mono text-sage">
                      {formatKes(b.grossAmount)} if accepted
                    </span>
                  }
                  cta={status.cta}
                  href={`/giver/bookings/${b.id}`}
                />
              );
            })
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="confirmed-heading">
        <h2 id="confirmed-heading" className="font-display text-lg">
          Confirmed visits
        </h2>
        <div className="mt-4 rounded-xl border border-alert/25 bg-alert/5 px-4 py-3 text-sm text-ink/80">
          When notified, <strong>call the patient first</strong>. Their number
          appears after payment confirms.
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {confirmedBookings.length === 0 ? (
            <EmptyState
              title="No confirmed bookings yet"
              description="Accepted visits show here once the family completes M-Pesa payment."
            />
          ) : (
            confirmedBookings.map((b, index) => {
              const status = bookingStatusPresentation(b.status, "giver");
              return (
                <RecordCard
                  key={b.id}
                  index={index}
                  eyebrow={categoryLabel(b.case.category)}
                  title={b.patient.name || "Patient"}
                  status={status.label}
                  tone={status.tone}
                  meta={[
                    {
                      icon: "calendar",
                      label: "When",
                      text: `${formatScheduledAt(b.scheduledAt)} · ${formatDuration(b.durationMinutes)}`,
                    },
                    {
                      icon: "phone",
                      label: "Call",
                      text: b.patient.phone || "Number after payment",
                    },
                  ]}
                  footerLeft={
                    <span className="font-mono text-sage">
                      {formatKes(b.caregiverPayout)}
                    </span>
                  }
                  cta={status.cta}
                  href={`/giver/bookings/${b.id}`}
                />
              );
            })
          )}
        </div>
      </section>
      <MobileNav role="giver" />
    </main>
  );
}
