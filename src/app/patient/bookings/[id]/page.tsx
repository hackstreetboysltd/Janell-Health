import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CompleteVisitButton } from "@/components/complete-visit-button";
import { ModuleHeading } from "@/components/module-heading";
import { ReportProviderForm } from "@/components/report-provider-form";
import { ReviewForm } from "@/components/review-form";
import { VisitNoteForm } from "@/components/visit-note-form";
import { StarRating } from "@/components/star-rating";
import { formatKes } from "@/lib/commission";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";

export default async function PatientBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, patientId: session.user.id },
    include: {
      caregiver: { include: { user: true } },
      case: true,
      review: true,
      visitNotes: true,
    },
  });
  if (!booking) notFound();

  if (booking.status === "PENDING_PAYMENT") {
    redirect(`/patient/pay/${booking.id}`);
  }

  const giverPhone = booking.caregiver.user.phone;
  const canComplete = booking.status === "CONFIRMED";
  const canReview = booking.status === "COMPLETED" && !booking.review;
  const canReport =
    booking.status === "CONFIRMED" || booking.status === "COMPLETED";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <AppHeader />
      <ModuleHeading wrapperClassName="mt-6">
        {booking.status === "PENDING_PROVIDER"
          ? "Request sent"
          : booking.status === "DECLINED"
            ? "Request declined"
            : booking.status === "COMPLETED"
              ? "Visit complete"
              : "Booking confirmed"}
      </ModuleHeading>

      {booking.status === "PENDING_PROVIDER" ? (
        <p className="mt-2 text-center text-ink/60">
          Waiting for {booking.caregiver.fullName} to accept. You will be notified
          to pay with M-Pesa once they confirm.
        </p>
      ) : null}

      {booking.status === "DECLINED" ? (
        <p className="mt-2 text-center text-ink/60">
          This professional is unavailable for your visit. You can choose another
          on the map.
        </p>
      ) : null}

      {booking.status === "CONFIRMED" ? (
        <p className="mt-2 text-center text-ink/60">
          Your healthcare professional has been notified. They should call you first.
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-lg font-semibold">{booking.caregiver.fullName}</p>
        <p className="text-sm text-ink/60">{booking.caregiver.profession}</p>
        <p className="mt-3 text-sm text-ink/50">Visit</p>
        <p className="text-sm text-ink/80">{booking.visitAddress}</p>
        <p className="mt-1 text-sm text-ink/55">
          {formatScheduledAt(booking.scheduledAt)} ·{" "}
          {formatDuration(booking.durationMinutes)}
        </p>
        {booking.status === "CONFIRMED" && giverPhone ? (
          <>
            <p className="mt-4 text-sm text-ink/50">Professional phone</p>
            <a
              href={`tel:${giverPhone}`}
              className="font-mono text-xl text-sage underline-offset-4 hover:underline"
            >
              {giverPhone}
            </a>
          </>
        ) : null}
        <p className="mt-4 font-mono text-sm text-ink/70">
          {formatKes(booking.grossAmount)}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-mist bg-white p-4">
        <p className="text-sm font-medium">{categoryLabel(booking.case.category)}</p>
        <p className="mt-2 text-sm text-ink/80">{booking.case.careSummary}</p>
      </div>

      {canComplete ? <CompleteVisitButton bookingId={booking.id} /> : null}

      {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") &&
      booking.visitNotes[0] ? (
        <VisitNoteForm
          bookingId={booking.id}
          initialBody={booking.visitNotes[0].body}
          readOnly
        />
      ) : null}

      {canReview ? <ReviewForm bookingId={booking.id} /> : null}
      {booking.review ? (
        <div className="mt-4 rounded-xl border border-mist bg-white p-4">
          <p className="text-sm font-medium">Your review</p>
          <div className="mt-2">
            <StarRating
              average={booking.review.rating}
              count={1}
            />
          </div>
          {booking.review.comment ? (
            <p className="mt-2 text-sm text-ink/70">{booking.review.comment}</p>
          ) : null}
        </div>
      ) : null}

      {canReport ? (
        <ReportProviderForm
          bookingId={booking.id}
          caregiverId={booking.caregiverId}
          caregiverName={booking.caregiver.fullName}
        />
      ) : null}

      {booking.status === "COMPLETED" || booking.status === "CONFIRMED" ? (
        <Link
          href={`/patient/cases/new?repeat=${booking.id}`}
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-sage font-semibold text-white"
        >
          Book again with {booking.caregiver.fullName.split(" ")[0]}
        </Link>
      ) : null}

      {booking.status === "DECLINED" ? (
        <Link
          href={`/patient/find?caseId=${booking.caseId}`}
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-sage font-semibold text-white"
        >
          Find another professional
        </Link>
      ) : (
        <Link
          href="/patient"
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-mist font-semibold text-ink/80"
        >
          Back to requests
        </Link>
      )}
    </main>
  );
}
