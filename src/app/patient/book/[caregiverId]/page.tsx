import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { CaregiverBadgeRow } from "@/components/caregiver-badge-row";
import { StarRating } from "@/components/star-rating";
import { ModuleHeading } from "@/components/module-heading";
import { formatKes, splitCommission } from "@/lib/commission";
import { calculateBookingGross } from "@/lib/booking-amount";
import { getCaregiverRating } from "@/lib/notify";
import {
  categoryLabel,
  formatDuration,
  formatScheduledAt,
} from "@/lib/care-categories";
import { caregiverLocationLabel, getRegionById } from "@/lib/regions";
import { serviceLabel } from "@/lib/services";
import { effectiveTier, isFeatured } from "@/lib/membership";
import { BookForm } from "@/components/book-form";
import { BookingSteps } from "@/components/booking-steps";

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

  const caseRecord = caseId
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
        <p className="mt-8 text-ink/70">Create a care request before booking.</p>
        <Link href="/patient/cases/new" className="mt-4 inline-block text-sage font-semibold">
          New request →
        </Link>
      </main>
    );
  }

  const grossAmount = calculateBookingGross(
    caregiver.rateType,
    caregiver.rateKes,
    caseRecord.durationMinutes,
  );
  const { platformFee, caregiverPayout } = splitCommission(grossAmount);
  const rating = await getCaregiverRating(caregiver.id);
  const regionName = getRegionById(caregiver.region)?.name ?? caregiver.region;
  const locationLabel = caregiverLocationLabel(caregiver.address, regionName);
  const membershipTier = effectiveTier(
    caregiver.membershipTier,
    caregiver.membershipUntil,
  );
  const featured = isFeatured(caregiver.featuredUntil);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8"
    >
      <AppHeader />
      <BookingSteps active="request" />
      <ModuleHeading
        wrapperClassName="mt-4"
        className="font-display text-3xl tracking-tight"
        backHref={caseRecord ? `/patient/find?caseId=${caseRecord.id}` : "/patient"}
      >
        Request visit
      </ModuleHeading>
      <p className="mt-1 text-sm text-ink/55">
        Review details, then send a request. Payment comes after they accept.
      </p>
      <section className="panel-card animate-fade-up mt-6 p-4 text-sm" aria-label="Visit details">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Your visit</p>
        <p className="mt-2 font-medium">{categoryLabel(caseRecord.category)}</p>
        <p className="mt-1 text-ink/70">{caseRecord.visitAddress}</p>
        <p className="mt-1 text-ink/55">
          {formatScheduledAt(caseRecord.scheduledAt)} ·{" "}
          {formatDuration(caseRecord.durationMinutes)}
        </p>
      </section>
      <section
        className="panel-card animate-fade-up mt-4 p-4"
        aria-label="Professional profile"
        style={{ animationDelay: "0.06s" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold">{caregiver.fullName}</p>
          <CaregiverBadgeRow
            verificationStatus={caregiver.verificationStatus}
            membershipTier={membershipTier}
            featured={featured}
            compact
          />
        </div>
        <p className="text-sm text-ink/60">
          {caregiver.profession} · {caregiver.yearsExperience} yrs · {locationLabel}
        </p>
        <div className="mt-2">
          <StarRating average={rating.average} count={rating.count} compact />
        </div>
        {caregiver.bio ? (
          <p className="mt-2 text-sm text-ink/70">{caregiver.bio}</p>
        ) : null}
        {caregiver.specializations.length > 0 ? (
          <p className="mt-2 text-xs text-ink/55">
            {caregiver.specializations.slice(0, 6).map(serviceLabel).join(" · ")}
            {caregiver.specializations.length > 6 ? " …" : ""}
          </p>
        ) : null}
        <p className="mt-3 font-mono text-lg font-semibold text-sage">
          {formatKes(grossAmount)} estimated
        </p>
        <dl className="mt-4 space-y-2 rounded-lg bg-canvas/80 px-3 py-2.5 text-sm text-ink/70">
          <div className="flex justify-between gap-4">
            <dt>Platform fee (10%)</dt>
            <dd className="font-mono tabular-nums">{formatKes(platformFee)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Professional receives</dt>
            <dd className="font-mono tabular-nums">{formatKes(caregiverPayout)}</dd>
          </div>
        </dl>
      </section>
      <BookForm
        caseId={caseRecord.id}
        caregiverId={caregiver.id}
        amount={grossAmount}
      />
    </main>
  );
}
