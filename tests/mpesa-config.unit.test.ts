import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isValidMpesaCallback,
  mpesaApiBaseUrl,
  mpesaEnvironment,
  mpesaMockEnabled,
  mpesaOAuthUrl,
  mpesaStkPushUrl,
} from "@/lib/mpesa-config";

describe("mpesaEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to sandbox", () => {
    vi.stubEnv("MPESA_ENV", "");
    expect(mpesaEnvironment()).toBe("sandbox");
  });

  it("uses production when MPESA_ENV=production", () => {
    vi.stubEnv("MPESA_ENV", "production");
    expect(mpesaEnvironment()).toBe("production");
  });
});

describe("mpesa API URLs", () => {
  it("points sandbox traffic at sandbox.safaricom.co.ke", () => {
    expect(mpesaApiBaseUrl("sandbox")).toBe("https://sandbox.safaricom.co.ke");
    expect(mpesaOAuthUrl("sandbox")).toContain("sandbox.safaricom.co.ke");
    expect(mpesaStkPushUrl("sandbox")).toContain("/stkpush/v1/processrequest");
  });

  it("points production traffic at api.safaricom.co.ke", () => {
    expect(mpesaApiBaseUrl("production")).toBe("https://api.safaricom.co.ke");
    expect(mpesaStkPushUrl("production")).toBe(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    );
  });
});

describe("mpesaMockEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off unless MPESA_MOCK=true", () => {
    vi.stubEnv("MPESA_MOCK", "false");
    vi.stubEnv("NODE_ENV", "development");
    expect(mpesaMockEnabled()).toBe(false);
  });

  it("is on in development when MPESA_MOCK=true", () => {
    vi.stubEnv("MPESA_MOCK", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(mpesaMockEnabled()).toBe(true);
  });

  it("is off in production even when MPESA_MOCK=true", () => {
    vi.stubEnv("MPESA_MOCK", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(mpesaMockEnabled()).toBe(false);
  });

  it("allows production mock only with ALLOW_MPESA_MOCK=true", () => {
    vi.stubEnv("MPESA_MOCK", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MPESA_MOCK", "true");
    expect(mpesaMockEnabled()).toBe(true);
  });
});

describe("isValidMpesaCallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows callbacks without a secret in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "");
    const req = new Request("http://localhost/api/mpesa/callback");
    expect(isValidMpesaCallback(req)).toBe(true);
  });

  it("rejects callbacks without a secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "");
    const req = new Request("https://app.example/api/mpesa/callback");
    expect(isValidMpesaCallback(req)).toBe(false);
  });

  it("requires matching token query param when secret is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MPESA_CALLBACK_SECRET", "s3cret");
    const ok = new Request("https://app.example/api/mpesa/callback?token=s3cret");
    const bad = new Request("https://app.example/api/mpesa/callback?token=wrong");
    expect(isValidMpesaCallback(ok)).toBe(true);
    expect(isValidMpesaCallback(bad)).toBe(false);
  });
});
