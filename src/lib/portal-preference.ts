import type { Portal } from "@/lib/portals";

/** Persist guest portal choice. Returns when Set-Cookie is applied. */
export async function persistPortalPreference(portal: Portal): Promise<void> {
  try {
    await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal }),
      keepalive: true,
    });
  } catch {
    // Preference cookie is best-effort; URL ?portal= already drives the UI.
  }
}

/** Non-blocking persist for portal-dock navigation (never delay routing). */
export function persistPortalPreferenceInBackground(portal: Portal): void {
  void persistPortalPreference(portal);
}
