import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: Role | null;
      phone?: string | null;
      onboarded?: boolean;
      isAdmin?: boolean;
    };
  }
}

/**
 * Edge-safe Auth.js config (no Prisma / Node-only imports).
 * Middleware must import this — not `@/auth` — or session cookies are invisible on Edge.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  cookies: {
    sessionToken: {
      // New name ignores stale cookies encrypted with another secret
      name: "carelink.session-token",
    },
  },
  pages: {
    signIn: "/",
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | null | undefined) ?? null;
        session.user.isAdmin = token.role === "ADMIN";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
