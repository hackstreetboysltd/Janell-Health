import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/access/admin";
import { AdminVerificationActions } from "@/components/admin-verification-actions";
import {
  AdminRecordCard,
  AdminRecordField,
  AdminRecordSection,
  AdminRecordShell,
} from "@/components/admin-record-shell";
import { VerifiedBadge } from "@/components/verified-badge";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/commission";
import { verificationStatusLabel } from "@/lib/verification";
import { PROVIDER_DOC_TYPE_LABELS } from "@/lib/provider-documents";

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ caregiverId: string }>;
}) {
  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) redirect("/");

  const { caregiverId } = await params;
  const profile = await prisma.caregiverProfile.findUnique({
    where: { id: caregiverId },
    include: {
      user: { select: { email: true, phone: true } },
      documents: { orderBy: { createdAt: "asc" } },
      verificationAudits: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { admin: { select: { name: true, email: true } } },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          patient: {
            select: {
              name: true,
              email: true,
              patientProfile: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!profile) notFound();

  return (
    <AdminRecordShell
      title={profile.fullName}
      badge={<VerifiedBadge status={profile.verificationStatus} />}
      subtitle={`${verificationStatusLabel(profile.verificationStatus)} · ${profile.profession}`}
    >
      <AdminRecordCard>
        <dl className="grid gap-2 sm:grid-cols-2">
          <AdminRecordField label="National ID">
            <span className="font-mono">{profile.nationalId}</span>
          </AdminRecordField>
          <AdminRecordField label="License / registration">
            <span className="font-mono">{profile.professionId}</span>
          </AdminRecordField>
          <AdminRecordField label="Experience">
            {profile.yearsExperience} years
          </AdminRecordField>
          <AdminRecordField label="Rate">
            <span className="font-mono">
              {formatKes(profile.rateKes)} /{" "}
              {profile.rateType === "HOURLY" ? "hr" : "visit"}
            </span>
          </AdminRecordField>
          <AdminRecordField label="Contact" wide>
            {profile.user.phone || "—"} · {profile.user.email}
          </AdminRecordField>
          {profile.bio ? (
            <AdminRecordField label="Bio" wide>
              <span className="text-ink/80">{profile.bio}</span>
            </AdminRecordField>
          ) : null}
        </dl>
      </AdminRecordCard>

      <AdminRecordSection title="Documents">
        {profile.documents.length === 0 ? (
          <p className="text-sm text-ink/45">No documents uploaded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-mist px-3 py-2 text-sm"
              >
                <span>
                  {doc.fileName}{" "}
                  <span className="text-ink/45">
                    (
                    {PROVIDER_DOC_TYPE_LABELS[
                      doc.documentType as keyof typeof PROVIDER_DOC_TYPE_LABELS
                    ] ?? doc.documentType}
                    )
                  </span>
                </span>
                <a
                  href={`/api/providers/${profile.id}/documents/${doc.id}`}
                  className="font-medium text-sage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>

      <AdminVerificationActions
        caregiverId={profile.id}
        currentStatus={profile.verificationStatus}
      />

      {profile.bookings.length > 0 ? (
        <AdminRecordSection title="Bookings">
          <ul className="flex flex-col gap-2">
            {profile.bookings.map((b) => {
              const patientName =
                b.patient.patientProfile?.name ||
                b.patient.name ||
                b.patient.email;
              return (
                <li key={b.id}>
                  <Link
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-mist px-3 py-2 text-sm transition hover:border-sage/40"
                  >
                    <span className="min-w-0 truncate">
                      {patientName}
                      <span className="text-ink/45">
                        {" "}
                        · {b.status.replaceAll("_", " ")}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-ink/60">
                      {formatKes(b.grossAmount)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </AdminRecordSection>
      ) : null}

      {profile.verificationAudits.length > 0 ? (
        <AdminRecordSection title="Audit trail">
          <ul className="flex flex-col gap-2 text-sm text-ink/70">
            {profile.verificationAudits.map((a) => (
              <li key={a.id} className="rounded-lg bg-mist/40 px-3 py-2">
                {a.action} by {a.admin.name || a.admin.email} ·{" "}
                {a.createdAt.toLocaleString("en-KE")}
                {a.note ? ` — ${a.note}` : ""}
              </li>
            ))}
          </ul>
        </AdminRecordSection>
      ) : null}
    </AdminRecordShell>
  );
}
