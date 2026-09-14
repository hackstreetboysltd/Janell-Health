import { AppHeader } from "@/components/app-header";
import { ModuleHeading } from "@/components/module-heading";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <AppHeader />
        <ModuleHeading backHref="/">{title}</ModuleHeading>
        <article className="prose prose-sm mt-6 max-w-none text-ink/80">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
