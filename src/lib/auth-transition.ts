/** Survives the Google OAuth round-trip so the hold screen paints on first return. */
export const AUTH_TRANSITION_KEY = "janell.authTransition";

export type AuthTransitionKind = "in" | "out";

export type AuthTransitionState = {
  kind: AuthTransitionKind;
  status: string;
};

export function statusForKind(kind: AuthTransitionKind): string {
  return kind === "in" ? "Signing you in…" : "Signing you out…";
}

export function readAuthTransition(): AuthTransitionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(AUTH_TRANSITION_KEY) ?? "",
    );
    if (!raw || typeof raw !== "object") return null;
    const rec = raw as Record<string, unknown>;
    const kind = rec.kind;
    const status = rec.status;
    if (kind !== "in" && kind !== "out") return null;
    if (typeof status !== "string" || !status.trim()) return null;
    return { kind, status };
  } catch {
    return null;
  }
}

export function writeAuthTransition(state: AuthTransitionState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_TRANSITION_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function clearAuthTransition(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_TRANSITION_KEY);
  } catch {
    /* private mode */
  }
}

/** Build + persist a transition; returns the state for immediate UI paint. */
export function beginAuthTransition(
  kind: AuthTransitionKind,
  status = statusForKind(kind),
): AuthTransitionState {
  const state = { kind, status };
  writeAuthTransition(state);
  return state;
}
