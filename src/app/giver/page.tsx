import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
import { formatKes } from "@/lib/commission";

export default async function GiverHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (session.user.role === "PATIENT") redirect("/patient");
  if (!session.user.onboarded) redirect("/onboarding/giver");

  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const bookings = await prisma.booking.findMany({
    where: { caregiverId: profile.id, status: "CONFIRMED" },
    orderBy: { createdAt: "desc" },
    include: {
      patient: true,
      case: true,
      payment: true,
    },
  });

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader />

      <h1 className="mt-8 font-display text-3xl">Bookings</h1>
      <p className="mt-2 text-ink/60">
        {profile.fullName} · {formatKes(profile.rateKes)} /{" "}
        {profile.rateType === "HOURLY" ? "hr" : "visit"}
        {unread > 0 ? ` · ${unread} new` : ""}
      </p>

      <div className="mt-4 rounded-xl border border-alert/25 bg-alert/5 px-4 py-3 text-sm text-ink/80">
        When notified, <strong>call the patient first</strong>. Their number
        appears after payment confirms.
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-mist bg-white/60 px-4 py-8 text-center text-ink/50">
            No confirmed bookings yet.
          </p>
        ) : (
          bookings.map((b) => (
            <Link
              key={b.id}
              href={`/giver/bookings/${b.id}`}
              className="rounded-xl border border-mist bg-white px-4 py-3"
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{b.patient.name || "Patient"}</p>
                <span className="font-mono text-sm text-sage">
                  {formatKes(b.caregiverPayout)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/55">
                Call: {b.patient.phone || "—"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-ink/70">
                {b.case.services.join(", ")}
              </p>
            </Link>
          ))
        )}
      </div>
      <MobileNav role="giver" />
    </main>
  );
}
