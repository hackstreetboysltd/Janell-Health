import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { NewCaseForm } from "@/components/new-case-form";
import { MobileNav } from "@/components/mobile-nav";
import { CARE_SERVICES } from "@/lib/services";

export default async function NewCasePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding/patient");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-40 pt-8">
      <AppHeader />
      <h1 className="mt-8 font-display text-3xl">New case</h1>
      <p className="mt-2 text-ink/60">
        Describe what you need, any prescription services, and attach examination files.
      </p>
      <div className="mt-8">
        <NewCaseForm services={[...CARE_SERVICES]} />
      </div>
      <MobileNav role="patient" />
    </main>
  );
}
