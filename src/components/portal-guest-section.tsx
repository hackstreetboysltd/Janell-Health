"use client";

import { useEffect, useState } from "react";
import { PortalDock } from "@/components/portal-dock";
import { SignInForm } from "@/components/sign-in-form";
import type { Portal } from "@/lib/portals";

/** Guest sign-in block with an instant patient ↔ caregiver portal switch. */
export function PortalGuestSection({
  initialPortal,
  googleConfigured,
  otpEnabled,
  devLoginEnabled,
  footer,
}: {
  initialPortal: Portal;
  googleConfigured: boolean;
  otpEnabled: boolean;
  devLoginEnabled: boolean;
  footer?: React.ReactNode;
}) {
  const [portal, setPortal] = useState(initialPortal);

  useEffect(() => {
    setPortal(initialPortal);
  }, [initialPortal]);

  return (
    <section className="mt-8">
      <PortalDock portal={portal} onPortalChange={setPortal} />
      <div className="mt-6">
        <SignInForm
          key={portal}
          portal={portal}
          googleConfigured={googleConfigured}
          otpEnabled={otpEnabled}
          devLoginEnabled={devLoginEnabled}
        />
      </div>
      {footer}
    </section>
  );
}
