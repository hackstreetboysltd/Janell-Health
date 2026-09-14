const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAFT_BYTES = 100_000;

type StoredDraft<T> = {
  v: T;
  savedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read a namespaced form draft from localStorage (returns null if missing, expired, or invalid). */
export function readFormDraft<T>(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed !== "object" || parsed.v == null) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

/** Persist a form draft snapshot (skips if payload is too large). */
export function writeFormDraft<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;
  try {
    const payload: StoredDraft<T> = { v: value, savedAt: Date.now() };
    const raw = JSON.stringify(payload);
    if (raw.length > MAX_DRAFT_BYTES) return false;
    window.localStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

/** Remove a saved draft. */
export function clearFormDraft(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore quota / privacy mode errors
  }
}

/** Debounce helper for draft writes in client components. */
export function createDraftDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return <T>(key: string, value: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      writeFormDraft(key, value);
      timer = null;
    }, delayMs);
  };
}

export const FORM_DRAFT_KEYS = {
  newCase: "carelink:draft:new-case",
  patientOnboarding: "carelink:draft:patient-onboarding",
  giverOnboarding: "carelink:draft:giver-onboarding",
} as const;
