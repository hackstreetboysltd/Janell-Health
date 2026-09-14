import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleHeading } from "@/components/module-heading";
import { AvailabilityWeekCalendar } from "@/components/availability-week-calendar";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function GiverAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const params = await searchParams;
  const weekStart = params.week
    ? startOfWeek(new Date(`${params.week}T12:00:00`))
    : startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: {
        caregiverId: profile.id,
        scheduledAt: { gte: weekStart, lt: weekEnd },
        status: {
          in: ["PENDING_PROVIDER", "PENDING_PAYMENT", "CONFIRMED", "COMPLETED"],
        },
      },
      include: { patient: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.providerTimeOff.findMany({
      where: {
        caregiverId: profile.id,
        date: { gte: weekStart, lt: weekEnd },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading>Availability</ModuleHeading>
      <p className="mt-2 text-ink/60">
        Week view — block time off and see confirmed visits.
      </p>
      <p className="mt-2 font-mono text-sm text-ink/55">
        Weekdays {profile.availableWeekdaysStart}–{profile.availableWeekdaysEnd}{" "}
        · Weekends {profile.availableWeekendsStart}–{profile.availableWeekendsEnd}
      </p>

      <div className="mt-6">
        <AvailabilityWeekCalendar
          caregiverId={profile.id}
          weekStartIso={weekStart.toISOString()}
          bookings={bookings.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt.toISOString(),
            durationMinutes: b.durationMinutes,
            status: b.status,
            patientName: b.patient.name || "Patient",
          }))}
          timeOff={timeOff.map((t) => ({
            id: t.id,
            date: t.date.toISOString(),
            startTime: t.startTime,
            endTime: t.endTime,
            note: t.note,
          }))}
        />
      </div>

      <MobileNav role="giver" />
    </main>
  );
}
