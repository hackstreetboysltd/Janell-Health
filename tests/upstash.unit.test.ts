import { afterEach, describe, expect, it, vi } from "vitest";

describe("upstashConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is false when credentials are missing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { upstashConfigured } = await import("@/lib/upstash");
    expect(upstashConfigured()).toBe(false);
  });

  it("is true when both URL and token are set", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const { upstashConfigured } = await import("@/lib/upstash");
    expect(upstashConfigured()).toBe(true);
  });
});
