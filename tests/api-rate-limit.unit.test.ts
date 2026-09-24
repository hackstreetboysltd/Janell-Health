import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_RATE_LIMIT_POLICIES,
  apiRateLimitEnabled,
  scopesForApiRequest,
} from "@/lib/api-rate-limit";

describe("apiRateLimitEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off in test unless API_RATE_LIMIT_ENABLED=true", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("API_RATE_LIMIT_ENABLED", "");
    expect(apiRateLimitEnabled()).toBe(false);

    vi.stubEnv("API_RATE_LIMIT_ENABLED", "true");
    expect(apiRateLimitEnabled()).toBe(true);
  });

  it("is on in non-test environments by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_RATE_LIMIT_ENABLED", "");
    expect(apiRateLimitEnabled()).toBe(true);
  });

  it("honours API_RATE_LIMIT_ENABLED=false", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_RATE_LIMIT_ENABLED", "false");
    expect(apiRateLimitEnabled()).toBe(false);
  });
});

describe("scopesForApiRequest", () => {
  it("returns no scopes for exempt health, M-Pesa callback, and portal preference", () => {
    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/health", { method: "GET" }),
      ),
    ).toEqual([]);

    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/mpesa/callback", { method: "POST" }),
      ),
    ).toEqual([]);

    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/portal", { method: "POST" }),
      ),
    ).toEqual([]);
  });

  it("adds auth scope for /api/auth routes", () => {
    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/auth/otp/send", { method: "POST" }),
      ),
    ).toEqual(["global", "auth"]);
  });

  it("adds upload scope for attachment and document POSTs", () => {
    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/cases/abc/attachments", {
          method: "POST",
        }),
      ),
    ).toEqual(["global", "upload"]);

    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/providers/cg1/documents", {
          method: "POST",
        }),
      ),
    ).toEqual(["global", "upload"]);
  });

  it("adds bookingCreate scope for booking and case POSTs", () => {
    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/bookings", { method: "POST" }),
      ),
    ).toEqual(["global", "bookingCreate"]);

    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/cases", { method: "POST" }),
      ),
    ).toEqual(["global", "bookingCreate"]);
  });

  it("applies global only for non-mutation API routes", () => {
    expect(
      scopesForApiRequest(
        new Request("http://localhost/api/geo/caregivers", { method: "GET" }),
      ),
    ).toEqual(["global"]);
  });
});

describe("API_RATE_LIMIT_POLICIES", () => {
  it("defines tighter caps for sensitive scopes", () => {
    expect(API_RATE_LIMIT_POLICIES.bookingCreate.limit).toBeLessThan(
      API_RATE_LIMIT_POLICIES.global.limit,
    );
    expect(API_RATE_LIMIT_POLICIES.upload.limit).toBeLessThan(
      API_RATE_LIMIT_POLICIES.global.limit,
    );
  });
});
