import type { Role } from "@prisma/client";
import { isAdminRole } from "@/lib/access/admin";
import { prisma } from "@/lib/prisma";
import type { Portal } from "@/lib/portals";

export function roleFromPortal(portal: unknown): Role | null {
  if (portal === "patient") return "PATIENT";
  if (portal === "giver") return "CAREGIVER";
  // "admin" never grants ADMIN — ops role is DB-only.
  return null;
}

/**
 * Apply the guest portal choice to the user row.
 * Used at credential sign-in and again after Google OAuth (URL ?portal=),
 * because cookies() is often unavailable in the OAuth event context.
 */
export async function applyPortalChoice(
  userId: string,
  portalHint?: unknown,
): Promise<{ role: Role | null; onboarded: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      patientProfile: { select: { id: true } },
      caregiverProfile: { select: { id: true } },
    },
  });

  if (!existing) {
    return { role: null, onboarded: false };
  }

  // Never demote ops accounts — portal cookies would wipe ADMIN on every sign-in.
  // Onboarding is still portal-specific so Patient / Caregiver land in that app.
  if (isAdminRole(existing.role)) {
    const requested = roleFromPortal(portalHint);
    const onboarded =
      requested === "CAREGIVER"
        ? Boolean(existing.caregiverProfile)
        : requested === "PATIENT"
          ? Boolean(existing.patientProfile)
          : true;
    return { role: "ADMIN", onboarded };
  }

  const role = roleFromPortal(portalHint);
  if (role && existing.role !== role) {
    await prisma.user.update({ where: { id: userId }, data: { role } });
  }

  const effective = role ?? existing.role;
  const onboarded =
    effective === "CAREGIVER"
      ? Boolean(existing.caregiverProfile)
      : effective === "PATIENT"
        ? Boolean(existing.patientProfile)
        : Boolean(existing.patientProfile || existing.caregiverProfile);

  return { role: effective, onboarded };
}

/**
 * Role written when a portal profile is saved.
 * ADMIN stays ADMIN — ops access is assigned in the database, not by onboarding.
 */
export function roleForPortalProfile(
  current: Role | null | undefined,
  portalRole: "PATIENT" | "CAREGIVER",
): Role {
  if (isAdminRole(current)) return "ADMIN";
  return portalRole;
}

/** Destinations after a successful sign-in for the portal the guest chose. */
export function postAuthPath(
  portal: Portal,
  opts: { onboarded: boolean },
): string {
  if (portal === "admin") return "/admin";
  if (portal === "giver") {
    return opts.onboarded ? "/giver" : "/onboarding/giver";
  }
  return opts.onboarded ? "/patient" : "/onboarding/patient";
}

/**
 * Where a signed-in session goes. An explicit Patient or Caregiver choice
 * wins over an ADMIN role so the portal switcher is the destination.
 * With no choice, ops accounts still open /admin.
 */
export function portalLandingPath(input: {
  portalHint: Portal | null;
  role: Role | null | undefined;
  isAdmin: boolean;
  onboarded: boolean;
}): string {
  if (input.portalHint === "patient" || input.portalHint === "giver") {
    return postAuthPath(input.portalHint, { onboarded: input.onboarded });
  }
  if (input.portalHint === "admin" || input.role === "ADMIN" || input.isAdmin) {
    return "/admin";
  }
  if (!input.onboarded) {
    return input.role === "CAREGIVER" ? "/onboarding/giver" : "/onboarding/patient";
  }
  return input.role === "CAREGIVER" ? "/giver" : "/patient";
}
