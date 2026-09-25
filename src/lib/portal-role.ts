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
  if (isAdminRole(existing.role)) {
    return { role: "ADMIN", onboarded: true };
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

/** Destinations after a successful guest sign-in for this portal. */
export function postAuthPath(
  portal: Portal,
  opts: { onboarded: boolean; isAdmin?: boolean },
): string {
  if (opts.isAdmin || portal === "admin") return "/admin";
  if (portal === "giver") {
    return opts.onboarded ? "/giver" : "/onboarding/giver";
  }
  return opts.onboarded ? "/patient" : "/onboarding/patient";
}
