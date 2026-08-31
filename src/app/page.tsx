import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BrandMark } from "@/components/brand-mark";
import { PortalDock } from "@/components/portal-dock";
import { SignInForm } from "@/components/sign-in-form";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role;
    if (!session.user.onboarded) {
      redirect(role === "CAREGIVER" ? "/onboarding/giver" : "/onboarding/patient");
    }
    redirect(role === "CAREGIVER" ? "/giver" : "/patient");
  }

  const params = await searchParams;
  const jar = await cookies();
  const cookiePortal = jar.get("carelink_portal")?.value;
  const portal =
    params.portal === "giver"
      ? "giver"
      : params.portal === "patient"
        ? "patient"
        : cookiePortal === "giver"
          ? "giver"
          : "patient";
  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-24 pt-12">
      <BrandMark size="sm" />
      <h1 className="mt-10 font-display text-3xl text-ink">
        {portal === "giver" ? "Healthcare giver" : "Patient"} sign in
      </h1>
      <p className="mt-2 text-ink/60">
        {googleConfigured
          ? "Continue with Google to open the account chooser."
          : "Log in with email and name for the demo, or set up Google OAuth later."}
      </p>
      <div className="mt-8">
        <SignInForm portal={portal} googleConfigured={googleConfigured} />
      </div>
      <PortalDock portal={portal} />
    </main>
  );
}
