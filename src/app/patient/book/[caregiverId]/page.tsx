import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { formatKes, splitCommission } from "@/lib/commission";
import { caregiverLocationLabel, getRegionById } from "@/lib/regions";
import { BookForm } from "@/components/book-form";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ caregiverId: string }>;
  searchParams: Promise<{ caseId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { caregiverId } = await params;
  const { caseId } = await searchParams;

  const caregiver = await prisma.caregiverProfile.findUnique({
    where: { id: caregiverId },
    include: { user: true },
  });
  if (!caregiver) notFound();

  let caseRecord = caseId
    ? await prisma.case.findFirst({
        where: { id: caseId, patientId: session.user.id, status: "OPEN" },
      })
    : await prisma.case.findFirst({
        where: { patientId: session.user.id, status: "OPEN" },
        orderBy: { createdAt: "desc" },
      });

  if (!caseRecord) {
    return (
      <main className="mx-auto max-w-lg px-5 py-8">
        <AppHeader />
        <p className="mt-8 text-ink/70">Create a case before booking.</p>
        <Link href="/patient/cases/new" className="mt-4 inline-block text-sage font-semibold">
          New case →
        </Link>
      </main>
    );
  }

  const { platformFee, caregiverPayout } = splitCommission(caregiver.rateKes);
  const regionName = getRegionById(caregiver.region)?.name ?? caregiver.region;
  const locationLabel = caregiverLocationLabel(caregiver.address, regionName);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">Confirm booking</h1>
      <div className="mt-6 rounded-xl border border-mist bg-white p-4">
        <p className="text-lg font-semibold">{caregiver.fullName}</p>
        <p className="text-sm text-ink/60">
          {caregiver.profession} · {locationLabel}
        </p>
        <p className="mt-3 font-mono text-sage">
          {formatKes(caregiver.rateKes)} /{" "}
          {caregiver.rateType === "HOURLY" ? "hour" : "visit"}
        </p>
        <dl className="mt-4 space-y-1 text-sm text-ink/70">
          <div className="flex justify-between">
            <dt>Platform fee (10%)</dt>
            <dd className="font-mono">{formatKes(platformFee)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Giver receives</dt>
            <dd className="font-mono">{formatKes(caregiverPayout)}</dd>
          </div>
        </dl>
      </div>
      <BookForm caseId={caseRecord.id} caregiverId={caregiver.id} amount={caregiver.rateKes} />
    </main>
  );
}
