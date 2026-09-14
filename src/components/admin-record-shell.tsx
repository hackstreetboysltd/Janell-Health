import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { ModuleHeading } from "@/components/module-heading";

/** Shared admin record layout — matches verification detail. */
export function AdminRecordShell({
  title,
  subtitle,
  badge,
  children,
  backHref = "/admin",
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-16 pt-8">
      <AppHeader />
      <ModuleHeading
        backHref={backHref}
        className="font-display text-3xl text-ink"
        trailing={badge}
      >
        {title}
      </ModuleHeading>
      {subtitle ? <p className="mt-2 text-ink/60">{subtitle}</p> : null}
      {children}
    </main>
  );
}

export function AdminRecordCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-mist bg-white p-4 text-sm dark:bg-white/[0.04]">
      {children}
    </div>
  );
}

export function AdminRecordField({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-ink/45">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export function AdminRecordSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
