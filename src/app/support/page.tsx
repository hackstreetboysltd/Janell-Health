import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { EmergencyBanner } from "@/components/emergency-banner";
import { ModuleHeading } from "@/components/module-heading";
import { SiteFooter } from "@/components/site-footer";
import { SupportForm } from "@/components/support-form";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <EmergencyBanner />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
        <AppHeader />
        <ModuleHeading>Customer support</ModuleHeading>
        <div className="mt-8">
          <SupportForm defaultEmail={session.user.email} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
