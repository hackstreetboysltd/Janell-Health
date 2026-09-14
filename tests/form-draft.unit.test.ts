import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFormDraft,
  readFormDraft,
  writeFormDraft,
} from "@/lib/form-draft";

const KEY = "carelink:test-draft";

describe("form-draft storage", () => {
  afterEach(() => {
    clearFormDraft(KEY);
    vi.unstubAllGlobals();
  });

  it("round-trips a draft object", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });

    expect(writeFormDraft(KEY, { name: "Jane", phone: "0712345678" })).toBe(true);
    expect(readFormDraft<{ name: string; phone: string }>(KEY)).toEqual({
      name: "Jane",
      phone: "0712345678",
    });
    clearFormDraft(KEY);
    expect(readFormDraft(KEY)).toBeNull();
  });

  it("returns null for expired drafts", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });

    store[KEY] = JSON.stringify({
      v: { x: 1 },
      savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    expect(readFormDraft(KEY, 7 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(store[KEY]).toBeUndefined();
  });

  it("returns null for invalid JSON", () => {
    const store: Record<string, string> = { [KEY]: "{not-json" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });
    expect(readFormDraft(KEY)).toBeNull();
  });
});
