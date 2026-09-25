import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { ModuleAddLink, ModuleHeading } from "@/components/module-heading";
import { AvailabilityCalendar } from "@/components/availability-calendar";

function parseMonth(monthParam: string | undefined): {
  year: number;
  month: number;
  start: Date;
  end: Date;
  monthIso: string;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) {
      year = y;
      month = m - 1;
    }
  }
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  // Include leading/trailing grid days (up to 6 before + after).
  const gridStart = new Date(year, month, 1 - start.getDay());
  gridStart.setHours(0, 0, 0, 0);
  const end = new Date(gridStart);
  end.setDate(end.getDate() + 42);
  const monthIso = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { year, month, start: gridStart, end, monthIso };
}

export default async function GiverAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const params = await searchParams;
  // Accept legacy ?week=YYYY-MM-DD by deriving its month.
  const monthHint =
    params.month ??
    (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)
      ? params.week.slice(0, 7)
      : undefined);
  const { start, end, monthIso } = parseMonth(monthHint);

  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({
      where: {
        caregiverId: profile.id,
        scheduledAt: { gte: start, lt: end },
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
        date: { gte: start, lt: end },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading
        trailing={
          <ModuleAddLink href="#block-time-off" label="Block time off" />
        }
      >
        Availability
      </ModuleHeading>
      <p className="mt-2 text-center font-mono text-sm text-ink/55">
        Weekdays {profile.availableWeekdaysStart}–{profile.availableWeekdaysEnd}{" "}
        · Weekends {profile.availableWeekendsStart}–{profile.availableWeekendsEnd}
      </p>

      <div className="mt-6">
        <AvailabilityCalendar
          caregiverId={profile.id}
          monthIso={monthIso}
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
