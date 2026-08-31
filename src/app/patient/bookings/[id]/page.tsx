import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CaseAttachmentsList } from "@/components/case-attachments-list";
import { formatKes } from "@/lib/commission";

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
      case: { include: { attachments: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!booking) notFound();

  const giverPhone = booking.caregiver.user.phone;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <AppHeader />
      <h1 className="mt-6 font-display text-3xl">Booking confirmed</h1>
      <p className="mt-2 text-ink/60">
        Your healthcare giver has been notified. They should call you first.
      </p>

      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-lg font-semibold">{booking.caregiver.fullName}</p>
        <p className="text-sm text-ink/60">{booking.caregiver.profession}</p>
        <p className="mt-3 text-sm text-ink/50">Giver phone</p>
        {giverPhone ? (
          <a
            href={`tel:${giverPhone}`}
            className="font-mono text-xl text-sage underline-offset-4 hover:underline"
          >
            {giverPhone}
          </a>
        ) : (
          <p>—</p>
        )}
        <p className="mt-4 font-mono text-sm text-ink/70">
          Paid {formatKes(booking.grossAmount)} · fee{" "}
          {formatKes(booking.platformFee)}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-mist bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">Your case</p>
          <time className="font-mono text-xs text-ink/40">
            {booking.case.createdAt.toLocaleDateString("en-KE")}
          </time>
        </div>
        <div
          className="prose prose-sm mt-2 max-w-none text-ink/80"
          dangerouslySetInnerHTML={{ __html: booking.case.wantHtml }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {booking.case.services.map((s) => (
            <span
              key={s}
              className="rounded bg-mist/70 px-2 py-0.5 text-xs text-ink/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <CaseAttachmentsList
        caseId={booking.case.id}
        attachments={booking.case.attachments}
        note="Your caregiver can view these after booking is confirmed."
      />

      <Link
        href="/patient"
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90"
      >
        Back to Cases
      </Link>
    </main>
  );
}
