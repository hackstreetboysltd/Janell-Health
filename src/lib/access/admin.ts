import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** DB `ADMIN` role is the source of truth for admin access. */
export function isAdminRole(role: Role | null | undefined): boolean {
  return role === "ADMIN";
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return isAdminRole(user?.role);
}

export async function requireAdminSession(session: Session | null) {
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const };
  }
  const role = session.user.role;
  const ok =
    isAdminRole(role) ||
    (role === undefined && (await isAdminUser(session.user.id)));
  if (!ok) return { ok: false as const, status: 403 as const };
  return { ok: true as const, userId: session.user.id };
}
