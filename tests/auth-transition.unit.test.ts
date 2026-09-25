import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_TRANSITION_KEY,
  beginAuthTransition,
  clearAuthTransition,
  readAuthTransition,
  statusForKind,
  writeAuthTransition,
} from "@/lib/auth-transition";

function stubSessionStorage() {
  const store: Record<string, string> = {};
  const sessionStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  vi.stubGlobal("window", { sessionStorage });
  vi.stubGlobal("sessionStorage", sessionStorage);
  return sessionStorage;
}

describe("auth-transition storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a sign-in hold and uses the default status copy", () => {
    const sessionStorage = stubSessionStorage();
    const state = beginAuthTransition("in");
    expect(state.kind).toBe("in");
    expect(state.status).toBe(statusForKind("in"));
    expect(readAuthTransition()).toEqual(state);
    expect(sessionStorage.getItem(AUTH_TRANSITION_KEY)).toContain('"in"');
  });

  it("round-trips a sign-out hold with custom status", () => {
    stubSessionStorage();
    writeAuthTransition({ kind: "out", status: "Signing you out…" });
    expect(readAuthTransition()).toEqual({
      kind: "out",
      status: "Signing you out…",
    });
  });

  it("rejects corrupt or partial payloads", () => {
    const sessionStorage = stubSessionStorage();
    sessionStorage.setItem(AUTH_TRANSITION_KEY, "{");
    expect(readAuthTransition()).toBeNull();
    sessionStorage.setItem(AUTH_TRANSITION_KEY, JSON.stringify({ kind: "in" }));
    expect(readAuthTransition()).toBeNull();
    sessionStorage.setItem(
      AUTH_TRANSITION_KEY,
      JSON.stringify({ kind: "sideways", status: "nope" }),
    );
    expect(readAuthTransition()).toBeNull();
  });

  it("clears the pending flag", () => {
    const sessionStorage = stubSessionStorage();
    beginAuthTransition("out");
    clearAuthTransition();
    expect(readAuthTransition()).toBeNull();
    expect(sessionStorage.getItem(AUTH_TRANSITION_KEY)).toBeNull();
  });
});
