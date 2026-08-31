import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";

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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">Your cases</h1>
      <p className="mt-2 text-ink/60">List what you need, then find a nearby giver.</p>

      <div className="mt-6 flex flex-col gap-3">
        {cases.length === 0 ? (
          <p className="rounded-xl border border-dashed border-mist bg-white/60 px-4 py-8 text-center text-ink/50">
            No cases yet. Create one to start.
          </p>
        ) : (
          cases.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-mist bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium uppercase tracking-wide text-ink/45">
                  {c.status}
                </p>
                <time className="font-mono text-xs text-ink/40">
                  {c.createdAt.toLocaleDateString("en-KE")}
                </time>
              </div>
              <div
                className="mt-2 line-clamp-2 text-sm text-ink/80"
                dangerouslySetInnerHTML={{ __html: c.wantHtml }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.services.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-mist/70 px-2 py-0.5 text-xs text-ink/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
              {c.status === "OPEN" ? (
                <Link
                  href={`/patient/find?caseId=${c.id}`}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-sage"
                >
                  Find nearest giver →
                </Link>
              ) : c.booking ? (
                <Link
                  href={`/patient/bookings/${c.booking.id}`}
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-sage"
                >
                  View booking →
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
        New case
      </Link>
      <MobileNav role="patient" />
    </main>
  );
}
