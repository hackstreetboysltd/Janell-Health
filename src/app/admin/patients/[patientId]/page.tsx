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

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) redirect("/");

  const { patientId } = await params;
  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          bookingsAsPatient: {
            orderBy: { createdAt: "desc" },
            take: 12,
            include: {
              caregiver: { select: { id: true, fullName: true } },
              payment: { select: { status: true } },
            },
          },
        },
      },
    },
  });
  if (!profile) notFound();

  const bookings = profile.user.bookingsAsPatient;

  return (
    <AdminRecordShell
      title={profile.name}
      subtitle={`${profile.ageBand.replaceAll("_", " ")}${
        profile.age > 0 ? ` · ${profile.age} years` : ""
      }`}
    >
      <AdminRecordCard>
        <dl className="grid gap-2 sm:grid-cols-2">
          <AdminRecordField label="Contact">
            {profile.user.phone || "—"} · {profile.user.email}
          </AdminRecordField>
          <AdminRecordField label="Account name">
            {profile.user.name || "—"}
          </AdminRecordField>
          <AdminRecordField label="Diagnosis" wide>
            {profile.diagnosis || "None on file"}
          </AdminRecordField>
          {profile.historyHtml ? (
            <AdminRecordField label="History" wide>
              <span className="whitespace-pre-wrap text-ink/80">
                {stripHtml(profile.historyHtml)}
              </span>
            </AdminRecordField>
          ) : null}
        </dl>
      </AdminRecordCard>

      <AdminRecordSection title="Bookings">
        {bookings.length === 0 ? (
          <p className="text-sm text-ink/45">No bookings yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookings.map((b) => (
              <li key={b.id}>
                <a
                  href={`/admin/bookings/${b.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-mist px-3 py-2 text-sm transition hover:border-sage/40"
                >
                  <span className="min-w-0 truncate">
                    {b.caregiver.fullName}
                    <span className="text-ink/45">
                      {" "}
                      · {b.status.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-ink/60">
                    {formatKes(b.grossAmount)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </AdminRecordSection>
    </AdminRecordShell>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
