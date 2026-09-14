import type { Portal } from "@/lib/portals";
import { parsePortal } from "@/lib/portals";

export type DemoLogin = {
  id: string;
  email: string;
  name: string;
  portal: Portal;
  at: number;
};

const STORAGE_KEY = "carelink.demo.logins";
const MAX_ENTRIES = 12;

export function demoLoginId(email: string, portal: Portal): string {
  return `${email.trim().toLowerCase()}::${portal}`;
}

export function readDemoLogins(): DemoLogin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is DemoLogin & { email: string; name: string } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as DemoLogin).email === "string" &&
          (item as DemoLogin).email.includes("@") &&
          typeof (item as DemoLogin).name === "string",
      )
      .map((item) => {
        const email = item.email.trim().toLowerCase();
        const portal = parsePortal(item.portal) ?? "patient";
        return {
          id:
            typeof item.id === "string" && item.id.includes("::")
              ? item.id
              : demoLoginId(email, portal),
          email,
          name: item.name.trim() || "Janell Health User",
          portal,
          at: typeof item.at === "number" ? item.at : 0,
        };
      })
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export function rememberDemoLogin(entry: {
  email: string;
  name: string;
  portal: Portal;
}) {
  if (typeof window === "undefined") return;
  const email = entry.email.trim().toLowerCase();
  const name = entry.name.trim() || "Janell Health User";
  if (!email.includes("@")) return;

  const id = demoLoginId(email, entry.portal);
  const next: DemoLogin[] = [
    { id, email, name, portal: entry.portal, at: Date.now() },
    ...readDemoLogins().filter((item) => item.id !== id),
  ].slice(0, MAX_ENTRIES);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode
  }
}
