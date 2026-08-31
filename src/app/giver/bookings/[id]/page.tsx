import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CaseAttachmentsList } from "@/components/case-attachments-list";
import { formatKes } from "@/lib/commission";

export default async function GiverBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;
  const profile = await prisma.caregiverProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/onboarding/giver");

  const booking = await prisma.booking.findFirst({
    where: { id, caregiverId: profile.id },
    include: {
      patient: { include: { patientProfile: true } },
      case: { include: { attachments: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!booking) notFound();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, bookingId: booking.id, readAt: null },
    data: { readAt: new Date() },
  });

  const phone = booking.patient.phone;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <AppHeader />
      <Link href="/giver" className="mt-6 text-sm text-sage">
        ← Bookings
      </Link>
      <h1 className="mt-4 font-display text-3xl">
        {booking.patient.name || "Patient"}
      </h1>

      <div className="mt-4 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm">
        Reach out to the patient first as soon as you are notified.
      </div>

      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-sm text-ink/50">Patient phone</p>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="mt-1 block font-mono text-2xl text-sage underline-offset-4 hover:underline"
          >
            {phone}
          </a>
        ) : (
          <p className="mt-1">Not provided</p>
        )}
        <p className="mt-4 text-sm text-ink/50">Your payout (90%)</p>
        <p className="font-mono text-lg">{formatKes(booking.caregiverPayout)}</p>
        <p className="mt-1 text-xs text-ink/45">
          Platform fee {formatKes(booking.platformFee)} of{" "}
          {formatKes(booking.grossAmount)}
        </p>
      </div>

      {booking.patient.patientProfile ? (
        <div className="mt-4 rounded-xl border border-mist bg-white p-4">
          <p className="text-sm font-medium">Patient details</p>
          <p className="mt-2 text-sm text-ink/70">
            Age {booking.patient.patientProfile.age} ·{" "}
            {booking.patient.patientProfile.diagnosis}
          </p>
          <div
            className="prose prose-sm mt-3 max-w-none text-ink/80"
            dangerouslySetInnerHTML={{
              __html: booking.patient.patientProfile.historyHtml,
            }}
          />
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-mist bg-white p-4">
        <p className="text-sm font-medium">Case request</p>
        <div
          className="prose prose-sm mt-2 max-w-none"
          dangerouslySetInnerHTML={{ __html: booking.case.wantHtml }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {booking.case.services.map((s) => (
            <span key={s} className="rounded bg-mist/70 px-2 py-0.5 text-xs">
              {s}
            </span>
          ))}
        </div>
      </div>

      {booking.status === "CONFIRMED" ? (
        <CaseAttachmentsList
          caseId={booking.case.id}
          attachments={booking.case.attachments}
          note="Shared by the patient for examination."
        />
      ) : null}
    </main>
  );
}
