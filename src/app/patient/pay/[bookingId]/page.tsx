import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { formatKes } from "@/lib/commission";
import { PayForm } from "@/components/pay-form";

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

  if (booking.status === "CONFIRMED") {
    redirect(`/patient/bookings/${booking.id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">M-Pesa payment</h1>
      <p className="mt-2 text-ink/60">
        Enter your number, approve the prompt on your phone, then we confirm.
      </p>
      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-sm text-ink/55">Amount</p>
        <p className="font-mono text-2xl text-alert">{formatKes(booking.grossAmount)}</p>
        <p className="mt-1 text-sm text-ink/60">to book {booking.caregiver.fullName}</p>
      </div>
      <PayForm
        bookingId={booking.id}
        defaultPhone={session.user.phone || ""}
      />
    </main>
  );
}
