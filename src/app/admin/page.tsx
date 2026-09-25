import { PortalDock } from "@/components/portal-dock";
import { PortalGuestSection } from "@/components/portal-guest-section";
import { ModuleHeading } from "@/components/module-heading";
import {
  AdminDashboardTabs,
  type AdminDashboardData,
} from "@/components/admin-dashboard-tabs";
import { AppHeader } from "@/components/app-header";
import { requireAdminSession } from "@/lib/access/admin";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/prisma";
import {
  devLoginEnabled,
  phoneOtpEnabled,
} from "@/lib/feature-flags";
import { getRedMetricsSnapshot } from "@/lib/red-metrics";
import Link from "next/link";

export default async function AdminHomePage() {
  const session = await auth();

  if (!session?.user) {
    return <AdminSignInGate />;
  }

  const admin = await requireAdminSession(session);

  if (!admin.ok) {
    return <AdminAccessDenied email={session.user.email} />;
  }

  return <AdminDashboard />;
}

async function AdminSignInGate() {
  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8"
    >
      <AppHeader guest />
      <PortalGuestSection
        initialPortal="admin"
        googleConfigured={googleConfigured}
        otpEnabled={phoneOtpEnabled()}
        devLoginEnabled={devLoginEnabled()}
      />
    </main>
  );
}

function AdminAccessDenied({ email }: { email?: string | null }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-8">
      <AppHeader guest />
      <section className="mt-8">
        <PortalDock portal="admin" />
        <ModuleHeading
          wrapperClassName="mt-6"
          className="font-display text-2xl tracking-tight text-ink"
          backHref="/"
        >
          Not an admin account
        </ModuleHeading>
        <p className="mt-2 text-center text-sm text-ink/55">
          {email ? (
            <>
              Signed in as <span className="font-mono text-ink/75">{email}</span>
              , but this user does not have the <span className="font-mono">ADMIN</span>{" "}
              role.
            </>
          ) : (
            <>This account does not have the ADMIN role.</>
          )}
        </p>
        <SignOutButton
          redirectTo="/admin"
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-sage font-medium text-white disabled:opacity-60"
        >
          Sign out and try another account
        </SignOutButton>
        <p className="mt-4 text-center text-sm text-ink/45">
          <Link href="/" className="text-sage hover:underline">
            Back to family / caregiver sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

async function AdminDashboard() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    pendingVerification,
    patientCount,
    liveBookings,
    bookingsThisWeek,
    paymentsSuccessWeek,
    paymentsFailedWeek,
    paymentsPending,
    givers,
    patients,
    bookings,
    red,
    dbHealthy,
    institutions,
    ambulances,
    referralCases,
  ] = await Promise.all([
    prisma.caregiverProfile.count({
      where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
    prisma.patientProfile.count(),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT", "PENDING_PROVIDER"] } },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: weekAgo },
        status: { in: ["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"] },
      },
    }),
    prisma.payment.count({
      where: { status: "SUCCESS", updatedAt: { gte: weekAgo } },
    }),
    prisma.payment.count({
      where: { status: "FAILED", updatedAt: { gte: weekAgo } },
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.caregiverProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.patientProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 80,
      include: {
        user: { select: { email: true, phone: true } },
      },
    }),
    prisma.booking.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 80,
      include: {
        caregiver: { select: { fullName: true } },
        patient: {
          select: {
            name: true,
            email: true,
            patientProfile: { select: { name: true } },
          },
        },
      },
    }),
    Promise.resolve(getRedMetricsSnapshot()),
    prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    ),
    prisma.institution.findMany({ orderBy: { name: "asc" } }),
    prisma.ambulanceProvider.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.case.count({ where: { institutionId: { not: null } } }),
  ]);

  const systemDegraded = !dbHealthy || red.errorRatePct >= 5;

  const data: AdminDashboardData = {
    overview: {
      pendingVerification,
      patientCount,
      liveBookings,
      bookingsThisWeek,
      paymentsSuccessWeek,
      paymentsFailedWeek,
      paymentsPending,
      system: {
        status: systemDegraded ? "degraded" : "ok",
        errorRatePct: red.errorRatePct,
        requests: red.requests,
      },
    },
    givers: givers.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      profession: p.profession,
      verificationStatus: p.verificationStatus,
    })),
    patients: patients.map((p) => ({
      id: p.id,
      name: p.name,
      ageBand: p.ageBand,
      age: p.age,
      diagnosis: p.diagnosis,
      contact: p.user.phone || p.user.email || "No contact",
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      scheduledAt: b.scheduledAt.toISOString(),
      grossAmount: b.grossAmount,
      caregiverName: b.caregiver.fullName,
      patientName:
        b.patient.patientProfile?.name ||
        b.patient.name ||
        b.patient.email ||
        "Patient",
    })),
    institutions: institutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      detail: `/referral/${inst.slug}`,
      status: inst.isActive ? "Active" : "Inactive",
    })),
    ambulances: ambulances.map((a) => ({
      id: a.id,
      name: a.name,
      detail: `${a.phone} · ${a.coverageArea}`,
      status: a.isActive ? "Live" : "Hidden",
    })),
    referralCases,
  };

  return (
    <main className="mx-auto flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden px-3 pb-1 pt-4 sm:px-5">
      <div className="shrink-0">
        <AppHeader size="sm" />
      </div>
      <AdminDashboardTabs data={data} />
    </main>
  );
}
