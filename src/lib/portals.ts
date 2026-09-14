export const PORTALS = ["patient", "giver", "admin"] as const;

export type Portal = (typeof PORTALS)[number];

export function parsePortal(value: unknown): Portal | null {
  if (value === "patient" || value === "giver" || value === "admin") {
    return value;
  }
  return null;
}

export function isOpsPortal(portal: Portal): boolean {
  return portal === "admin";
}
