import type { NextAuthConfig } from "next-auth";

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
} satisfies NextAuthConfig;
