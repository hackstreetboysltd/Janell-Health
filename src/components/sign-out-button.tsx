"use client";

import { signOut } from "next-auth/react";
import { useAuthTransition } from "@/components/auth-transition-provider";

export function SignOutButton({
  redirectTo = "/",
  className,
  children = "Sign out",
}: {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { begin, active } = useAuthTransition();
  const busy = active?.kind === "out";

  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={() => {
        begin("out");
        void signOut({ callbackUrl: redirectTo });
      }}
    >
      {children}
    </button>
  );
}
