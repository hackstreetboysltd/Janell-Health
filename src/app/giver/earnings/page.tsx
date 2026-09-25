import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-state";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleHeading } from "@/components/module-heading";
import { RecordCard } from "@/components/record-card";
import { bookingStatusPresentation } from "@/lib/booking-status-ui";
import { formatKes } from "@/lib/commission";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";

export default async function GiverEarningsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [completed, upcoming] = await Promise.all([
    prisma.booking.findMany({
      where: {
        caregiverId: profile.id,
        status: "COMPLETED",
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
      include: { case: true, patient: true },
    }),
    prisma.booking.findMany({
      where: {
        caregiverId: profile.id,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
      orderBy: { scheduledAt: "asc" },
      include: { case: true, patient: true },
    }),
  ]);

  const totalEarned = completed.reduce((sum, b) => sum + b.caregiverPayout, 0);
  const monthEarned = completed
    .filter((b) => b.scheduledAt >= monthStart)
    .reduce((sum, b) => sum + b.caregiverPayout, 0);
  const upcomingPayout = upcoming.reduce(
    (sum, b) => sum + b.caregiverPayout,
    0,
  );

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8"
    >
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading>Earnings</ModuleHeading>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <StatCard label="Total earned" value={formatKes(totalEarned)} />
        <StatCard label="This month" value={formatKes(monthEarned)} />
        <StatCard
          label="Upcoming"
          value={formatKes(upcomingPayout)}
          className="col-span-2"
        />
      </dl>

      {upcoming.length > 0 ? (
        <section className="mt-8" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="font-display text-lg">
            Upcoming payouts
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {upcoming.map((b, index) => {
              const status = bookingStatusPresentation(b.status, "giver");
              return (
                <li key={b.id}>
                  <RecordCard
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
                    ]}
                    footerLeft={
                      <span className="font-mono text-sage">
                        {formatKes(b.caregiverPayout)}
                      </span>
                    }
                    cta={status.cta}
                    href={`/giver/bookings/${b.id}`}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="mt-8">
          <EmptyState
            title="No upcoming payouts"
            description="Confirmed visits awaiting payment will appear here with expected payout amounts."
          />
        </section>
      )}

      <section className="mt-8" aria-labelledby="completed-heading">
        <h2 id="completed-heading" className="font-display text-lg">
          Completed visits
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {completed.length === 0 ? (
            <li>
              <EmptyState
                title="No completed visits yet"
                description="Your earnings history builds here after each finished home visit."
              />
            </li>
          ) : (
            completed.map((b, index) => {
              const status = bookingStatusPresentation(b.status, "giver");
              return (
                <li key={b.id}>
                  <RecordCard
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
                    ]}
                    footerLeft={
                      <span className="font-mono text-sage">
                        +{formatKes(b.caregiverPayout)}
                      </span>
                    }
                    cta={status.cta}
                    href={`/giver/bookings/${b.id}`}
                  />
                </li>
              );
            })
          )}
        </ul>
      </section>

      <MobileNav role="giver" />
    </main>
  );
}

function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`dash-stat ${className}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
