import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/app-header";
import { KenyaEmergencyCallbook } from "@/components/kenya-emergency-callbook";
import { ModuleHeading } from "@/components/module-heading";
import { SiteFooter } from "@/components/site-footer";

export default async function EmergencyPage() {
  const ambulances = await prisma.ambulanceProvider.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
        <AppHeader />

        <section className="mt-8">
          <ModuleHeading
            wrapperClassName=""
            className="font-display text-2xl text-[#8b1e1e] dark:text-[#f5a8a8]"
            backHref="/patient"
          >
            Verified Emergency Services
          </ModuleHeading>

          <ul className="mt-6 flex flex-col gap-3">
            {ambulances.length === 0 ? (
              <li className="rounded-xl border border-dashed border-mist px-4 py-8 text-center text-sm text-ink/50">
                No verified emergency partners listed yet.
              </li>
            ) : (
              ambulances.map((a) => {
                const services = a.services ?? [];
                return (
                  <li
                    key={a.id}
                    className="rounded-xl border border-mist bg-white px-4 py-4 dark:bg-white/5"
                  >
                    <p className="font-semibold">{a.name}</p>
                    <p className="mt-0.5 text-sm text-ink/55">{a.coverageArea}</p>

                    {services.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {services.map((service) => (
                          <li
                            key={service}
                            className="flex items-start gap-2 text-sm text-ink/75"
                          >
                            <span
                              aria-hidden
                              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#8b1e1e]/70"
                            />
                            {service}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <a
                      href={`tel:${a.phone.replace(/\s+/g, "")}`}
                      className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#8b1e1e] text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Call {a.phone}
                    </a>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        <KenyaEmergencyCallbook />
      </main>
      <SiteFooter />
    </div>
  );
}
