import { logger } from "@/lib/logger";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/access/admin";
import { verifyPhoneOtp } from "@/lib/otp";
import {
  normalizeKenyanPhone,
  syntheticEmailForPhone,
} from "@/lib/phone";
import { applyPortalChoice, roleFromPortal } from "@/lib/portal-role";
import { devLoginEnabled, phoneOtpEnabled } from "@/lib/feature-flags";

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role | null;
    phone?: string | null;
    onboarded?: boolean;
    isAdmin?: boolean;
  }
}

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

const demoLoginEnabled = devLoginEnabled();
const otpLoginEnabled = phoneOtpEnabled();

async function applyPortalRole(userId: string, portalHint?: unknown) {
  try {
    let hint = portalHint;
    if (!roleFromPortal(hint)) {
      const jar = await cookies();
      hint = jar.get("carelink_portal")?.value;
    }
    await applyPortalChoice(userId, hint);
  } catch {
    // cookies() unavailable in some OAuth event contexts — home page
    // re-applies from ?portal= after Google returns.
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  logger: {
    error(error) {
      const msg = String(error);
      if (msg.includes("JWTSessionError") || msg.includes("decryption secret")) {
        return;
      }
      logger.error("auth.jwt_session_error", {
        detail: msg.slice(0, 200),
      });
    },
  },
  providers: [
    ...(otpLoginEnabled
      ? [
          Credentials({
            id: "phone-otp",
            name: "Phone OTP",
            credentials: {
              phone: { label: "Phone", type: "text" },
              code: { label: "Code", type: "text" },
              portal: { label: "Portal", type: "text" },
            },
            async authorize(credentials) {
              const phone = normalizeKenyanPhone(String(credentials?.phone || ""));
              const code = String(credentials?.code || "").trim();
              if (!phone || code.length !== 6) return null;

              const verified = await verifyPhoneOtp(phone, code);
              if (!verified.ok) return null;

              const email = syntheticEmailForPhone(phone);
              const portalRole = roleFromPortal(credentials?.portal);
              const user = await prisma.user.upsert({
                where: { email },
                create: {
                  email,
                  phone,
                  name: null,
                  emailVerified: new Date(),
                  ...(portalRole ? { role: portalRole } : {}),
                },
                update: { phone, emailVerified: new Date() },
              });
              await applyPortalRole(user.id, credentials?.portal);

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            authorization: {
              params: {
                prompt: "select_account",
                access_type: "online",
                response_type: "code",
              },
            },
          }),
        ]
      : []),
    // Demo email/name login — development only unless ALLOW_DEV_LOGIN=true
    ...(demoLoginEnabled && !googleConfigured
      ? [
          Credentials({
            id: "dev-google",
            name: "Demo log in",
            credentials: {
              email: { label: "Email", type: "email" },
              name: { label: "Name", type: "text" },
              portal: { label: "Portal", type: "text" },
            },
            async authorize(credentials) {
              const email = String(credentials?.email || "")
                .trim()
                .toLowerCase();
              const name = String(credentials?.name || "Janell Health User").trim();
              if (!email.includes("@")) return null;

              const portalRole = roleFromPortal(credentials?.portal);
              const user = await prisma.user.upsert({
                where: { email },
                create: {
                  email,
                  name,
                  emailVerified: new Date(),
                  ...(portalRole ? { role: portalRole } : {}),
                },
                update: { name },
              });
              await applyPortalRole(user.id, credentials?.portal);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;

      const needsFullRefresh =
        Boolean(user) ||
        trigger === "update" ||
        token.role === undefined ||
        token.onboarded === undefined ||
        // Re-check DB until a profile exists — JWT can stay stale after onboarding POST.
        token.onboarded === false;

      if (!token.sub) return token;

      if (needsFullRefresh) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { patientProfile: true, caregiverProfile: true },
        });
        token.role = dbUser?.role ?? null;
        token.phone = dbUser?.phone ?? null;
        if (dbUser?.role === "CAREGIVER") {
          token.onboarded = Boolean(dbUser.caregiverProfile);
        } else if (dbUser?.role === "PATIENT") {
          token.onboarded = Boolean(dbUser.patientProfile);
        } else {
          token.onboarded = Boolean(
            dbUser?.patientProfile || dbUser?.caregiverProfile,
          );
        }
      } else {
        // Keep role in sync so ADMIN promotions apply without waiting for re-login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        token.role = dbUser?.role ?? null;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | null | undefined) ?? null;
        session.user.phone = (token.phone as string | null | undefined) ?? null;
        session.user.onboarded = Boolean(token.onboarded);
        session.user.isAdmin = isAdminRole(
          (token.role as Role | null | undefined) ?? null,
        );
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await applyPortalRole(user.id);
    },
    async signIn({ user }) {
      if (user.id) await applyPortalRole(user.id);
    },
  },
});
