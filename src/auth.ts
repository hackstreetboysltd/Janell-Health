import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

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
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role | null;
    phone?: string | null;
    onboarded?: boolean;
  }
}

const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

function roleFromPortal(portal: unknown): Role | null {
  if (portal === "patient") return "PATIENT";
  if (portal === "giver") return "CAREGIVER";
  return null;
}

async function applyPortalRole(userId: string, portalHint?: unknown) {
  try {
    let role = roleFromPortal(portalHint);
    if (!role) {
      const jar = await cookies();
      role = roleFromPortal(jar.get("carelink_portal")?.value);
    }
    if (!role) return;
    // Portal choice at sign-in is authoritative so switching
    // patient ↔ giver does not leave a stale role.
    await prisma.user.update({ where: { id: userId }, data: { role } });
  } catch {
    // cookies() unavailable in some event contexts
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
      console.error("[auth]", error);
    },
  },
  providers: [
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
    // Demo email/name login until Google OAuth is ready (keep even if Google keys exist empty)
    ...(!googleConfigured
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
              const name = String(credentials?.name || "Carelink User").trim();
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
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { patientProfile: true, caregiverProfile: true },
        });
        token.role = dbUser?.role ?? null;
        token.phone = dbUser?.phone ?? null;
        // Onboarded for the active portal only — having a patient
        // profile must not skip giver onboarding (and vice versa).
        if (dbUser?.role === "CAREGIVER") {
          token.onboarded = Boolean(dbUser.caregiverProfile);
        } else if (dbUser?.role === "PATIENT") {
          token.onboarded = Boolean(dbUser.patientProfile);
        } else {
          token.onboarded = Boolean(
            dbUser?.patientProfile || dbUser?.caregiverProfile,
          );
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | null | undefined) ?? null;
        session.user.phone = (token.phone as string | null | undefined) ?? null;
        session.user.onboarded = Boolean(token.onboarded);
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
