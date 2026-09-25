"use client";

import { SessionProvider } from "next-auth/react";
import { AuthTransitionProvider } from "@/components/auth-transition-provider";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthTransitionProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthTransitionProvider>
    </SessionProvider>
  );
}
