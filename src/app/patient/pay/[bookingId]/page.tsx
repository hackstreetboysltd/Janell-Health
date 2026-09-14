import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { BookingSteps } from "@/components/booking-steps";
import { PayForm } from "@/components/pay-form";
import { AppHeader } from "@/components/app-header";
import { ModuleHeading } from "@/components/module-heading";
import { formatKes } from "@/lib/commission";
import { prisma } from "@/lib/prisma";

export default async function PayPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { bookingId } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, patientId: session.user.id },
    include: { caregiver: true, payment: true },
  });
  if (!booking) notFound();

  if (booking.status === "PENDING_PROVIDER") {
    redirect(`/patient/bookings/${booking.id}`);
  }

  if (booking.status === "CONFIRMED") {
    redirect(`/patient/bookings/${booking.id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8">
      <AppHeader />
      <BookingSteps active="pay" />

      <header className="mt-8 stagger-fade">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage">
          Secure checkout
        </p>
        <ModuleHeading
          wrapperClassName="mt-2"
          className="font-display text-3xl leading-tight"
          backHref={`/patient/bookings/${booking.id}`}
        >
          Pay with M-Pesa
        </ModuleHeading>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Approve the prompt on your phone. We confirm automatically — no manual codes.
        </p>
      </header>

      <div className="trust-strip mt-5 stagger-fade">
        <span>M-Pesa STK push</span>
        <span className="trust-strip-dot" aria-hidden />
        <span>Encrypted</span>
        <span className="trust-strip-dot" aria-hidden />
        <span>Instant confirmation</span>
      </div>

      <section
        className="panel-card mt-6 overflow-hidden stagger-fade"
        aria-label="Payment summary"
      >
        <div className="border-b border-mist/80 bg-canvas/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink/45">
            You pay
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="font-mono text-3xl font-medium tabular-nums text-alert">
            {formatKes(booking.grossAmount)}
          </p>
          <p className="mt-2 text-sm text-ink/65">
            Visit with{" "}
            <span className="font-medium text-ink/85">{booking.caregiver.fullName}</span>
          </p>
        </div>
      </section>

      <ol className="pay-instructions mt-6 space-y-2 text-sm text-ink/60 stagger-fade">
        <li>
          <span className="font-medium text-ink/75">1.</span> Enter your Safaricom number below
        </li>
        <li>
          <span className="font-medium text-ink/75">2.</span> Tap pay — a prompt appears on your
          phone
        </li>
        <li>
          <span className="font-medium text-ink/75">3.</span> Enter your M-Pesa PIN within 60 seconds
        </li>
      </ol>

      <PayForm bookingId={booking.id} defaultPhone={session.user.phone || ""} />
    </main>
  );
}
