import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/access/admin";
import {
  AdminRecordCard,
  AdminRecordField,
  AdminRecordSection,
  AdminRecordShell,
} from "@/components/admin-record-shell";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/commission";
import { formatDuration, formatScheduledAt } from "@/lib/care-categories";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) redirect("/");

  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      caregiver: {
        select: { id: true, fullName: true, profession: true },
      },
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          patientProfile: { select: { id: true, name: true } },
        },
      },
      payment: true,
      case: {
        select: {
          id: true,
          category: true,
          careSummary: true,
        },
      },
      visitNotes: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      review: true,
    },
  });
  if (!booking) notFound();

  const patientLabel =
    booking.patient.patientProfile?.name ||
    booking.patient.name ||
    booking.patient.email;

  return (
    <AdminRecordShell
      title={formatScheduledAt(booking.scheduledAt)}
      subtitle={`${booking.status.replaceAll("_", " ")} · ${formatDuration(
        booking.durationMinutes,
      )}`}
    >
      <AdminRecordCard>
        <dl className="grid gap-2 sm:grid-cols-2">
          <AdminRecordField label="Patient">
            {booking.patient.patientProfile ? (
              <Link
                href={`/admin/patients/${booking.patient.patientProfile.id}`}
                className="text-sage hover:underline"
              >
                {patientLabel}
              </Link>
            ) : (
              patientLabel
            )}
          </AdminRecordField>
          <AdminRecordField label="Professional">
            <Link
              href={`/admin/verification/${booking.caregiver.id}`}
              className="text-sage hover:underline"
            >
              {booking.caregiver.fullName}
            </Link>
            <span className="text-ink/45">
              {" "}
              · {booking.caregiver.profession}
            </span>
          </AdminRecordField>
          <AdminRecordField label="Gross">
            <span className="font-mono">{formatKes(booking.grossAmount)}</span>
          </AdminRecordField>
          <AdminRecordField label="Payment">
            {booking.payment
              ? booking.payment.status
              : "No payment"}
          </AdminRecordField>
          <AdminRecordField label="Visit address" wide>
            {booking.visitAddress || "—"}
          </AdminRecordField>
          {booking.case.careSummary ? (
            <AdminRecordField label="Care request" wide>
              <span className="text-ink/80">{booking.case.careSummary}</span>
            </AdminRecordField>
          ) : null}
        </dl>
      </AdminRecordCard>

      {booking.visitNotes.length > 0 ? (
        <AdminRecordSection title="Visit notes">
          <ul className="flex flex-col gap-2 text-sm text-ink/70">
            {booking.visitNotes.map((n) => (
              <li key={n.id} className="rounded-lg bg-mist/40 px-3 py-2">
                {n.body}
                <span className="mt-1 block text-[11px] text-ink/40">
                  {n.createdAt.toLocaleString("en-KE")}
                </span>
              </li>
            ))}
          </ul>
        </AdminRecordSection>
      ) : null}

      {booking.review ? (
        <AdminRecordSection title="Review">
          <p className="text-sm text-ink/70">
            {booking.review.rating}/5
            {booking.review.comment ? ` — ${booking.review.comment}` : ""}
          </p>
        </AdminRecordSection>
      ) : null}
    </AdminRecordShell>
  );
}
