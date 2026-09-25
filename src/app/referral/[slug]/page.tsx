import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrandMark } from "@/components/brand-mark";
import { ModuleHeading } from "@/components/module-heading";

export default async function ReferralLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const institution = await prisma.institution.findFirst({
    where: { slug, isActive: true },
  });
  if (!institution) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-12">
      <BrandMark size="sm" />
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-sage">
        Hospital partner
      </p>
      <ModuleHeading wrapperClassName="mt-2">{institution.name}</ModuleHeading>
      <p className="mt-4 text-center text-ink/70">{institution.description}</p>
      <p className="mt-4 rounded-xl border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-ink/75">
        You were referred for <strong>post-discharge home care</strong>. Janell Health
        connects you with verified nurses and caregivers in Nairobi.
      </p>
      {institution.contactPhone ? (
        <p className="mt-3 text-sm text-ink/55">
          Hospital line:{" "}
          <a href={`tel:${institution.contactPhone}`} className="font-mono text-sage">
            {institution.contactPhone}
          </a>
        </p>
      ) : null}
      <Link
        href={`/api/referral/${slug}`}
        className="mt-8 flex min-h-12 items-center justify-center rounded-xl bg-sage font-semibold text-white"
      >
        Continue to Janell Health
      </Link>
    </main>
  );
}
