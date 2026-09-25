import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { PortalGuestSection } from "@/components/portal-guest-section";
import {
  devLoginEnabled,
  phoneOtpEnabled,
} from "@/lib/feature-flags";
import { applyPortalChoice, portalLandingPath } from "@/lib/portal-role";
import { parsePortal } from "@/lib/portals";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (session?.user?.id) {
    const portalHint = parsePortal(params.portal);
    // After Google OAuth, ?portal= is the reliable hint (cookie often missing
    // in the OAuth event). Apply it before routing so the chosen portal wins,
    // including when the Google account is also an ops admin.
    let onboarded = Boolean(session.user.onboarded);
    if (portalHint === "patient" || portalHint === "giver") {
      const applied = await applyPortalChoice(session.user.id, portalHint);
      onboarded = applied.onboarded;
    }

    redirect(
      portalLandingPath({
        portalHint,
        role: session.user.role,
        isAdmin: Boolean(session.user.isAdmin),
        onboarded,
      }),
    );
  }

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
