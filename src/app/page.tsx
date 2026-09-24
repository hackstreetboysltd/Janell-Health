import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { PortalGuestSection } from "@/components/portal-guest-section";
import {
  devLoginEnabled,
  phoneOtpEnabled,
} from "@/lib/feature-flags";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role;
    if (role === "ADMIN" || session.user.isAdmin) {
      redirect("/admin");
    }
    if (!session.user.onboarded) {
      redirect(role === "CAREGIVER" ? "/onboarding/giver" : "/onboarding/patient");
    }
    redirect(role === "CAREGIVER" ? "/giver" : "/patient");
  }

  const params = await searchParams;
  const jar = await cookies();
  const cookiePortal = jar.get("carelink_portal")?.value;
  // Explicit ?portal= wins over a stale cookie (navigate-first portal switch).
  if (params.portal === "admin") {
    redirect("/admin");
  }
  if (!params.portal && cookiePortal === "admin") {
    redirect("/admin");
  }
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
  const otpEnabled = phoneOtpEnabled();
  const devEnabled = devLoginEnabled();

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-28 pt-8"
    >
      <AppHeader guest />

      <PortalGuestSection
        initialPortal={portal}
        googleConfigured={googleConfigured}
        otpEnabled={otpEnabled}
        devLoginEnabled={devEnabled}
      />
    </main>
  );
}
