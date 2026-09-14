import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CaseAttachmentsList } from "@/components/case-attachments-list";
import { GiverBookingRespond } from "@/components/giver-booking-respond";
import { ModuleHeading } from "@/components/module-heading";
import { VisitNoteForm } from "@/components/visit-note-form";
import { formatKes } from "@/lib/commission";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";

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
      visitNotes: true,
    },
  });
  if (!booking) notFound();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, bookingId: booking.id, readAt: null },
    data: { readAt: new Date() },
  });

  const phone = booking.patient.phone;
  const showContact = booking.status === "CONFIRMED";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <AppHeader isAdmin={session.user.isAdmin} />
      <ModuleHeading wrapperClassName="mt-6">
        {booking.patient.name || "Patient"}
      </ModuleHeading>
      <p className="mt-1 text-sm text-ink/55">Status: {booking.status}</p>

      {booking.status === "PENDING_PROVIDER" ? (
        <p className="mt-4 rounded-xl border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-ink/80">
          Review the visit details below. Accept to send the patient a payment
          link — their phone is shared after they pay.
        </p>
      ) : showContact ? (
        <div className="mt-4 rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm">
          Reach out to the patient first as soon as you are notified.
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-sm font-medium">{categoryLabel(booking.case.category)}</p>
        <p className="mt-2 text-sm text-ink/80">{booking.visitAddress}</p>
        <p className="mt-1 text-sm text-ink/55">
          {formatScheduledAt(booking.scheduledAt)} ·{" "}
          {formatDuration(booking.durationMinutes)}
        </p>
        <p className="mt-3 text-sm text-ink/75">{booking.case.careSummary}</p>
        {booking.case.specialRequirements ? (
          <p className="mt-2 text-sm text-ink/60">
            Note: {booking.case.specialRequirements}
          </p>
        ) : null}
        <p className="mt-4 font-mono text-sage">{formatKes(booking.caregiverPayout)} payout</p>
      </div>

      {showContact ? (
        <div className="mt-4 rounded-xl border border-mist bg-white p-4">
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
        </div>
      ) : null}

      {booking.status === "PENDING_PROVIDER" ? (
        <GiverBookingRespond bookingId={booking.id} />
      ) : null}

      {booking.status === "CONFIRMED" ? (
        <CaseAttachmentsList
          caseId={booking.case.id}
          attachments={booking.case.attachments}
          note="Shared by the patient for examination."
        />
      ) : null}

      {booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? (
        <VisitNoteForm
          bookingId={booking.id}
          initialBody={booking.visitNotes[0]?.body}
        />
      ) : null}
    </main>
  );
}
