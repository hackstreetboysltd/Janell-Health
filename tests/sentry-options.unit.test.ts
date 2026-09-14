import { afterEach, describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import {
  getTracesSampleRate,
  scrubSentryEvent,
  sentryEnabled,
} from "@/lib/sentry-options";

describe("sentryEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when SENTRY_DSN is unset", () => {
    vi.stubEnv("SENTRY_DSN", "");
    expect(sentryEnabled()).toBe(false);
  });

  it("returns true when SENTRY_DSN is set", () => {
    vi.stubEnv("SENTRY_DSN", "https://example@o0.ingest.sentry.io/0");
    expect(sentryEnabled()).toBe(true);
  });
});

describe("getTracesSampleRate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 0 outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "");
    expect(getTracesSampleRate()).toBe(0);
  });

  it("parses a valid sample rate", () => {
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "0.25");
    expect(getTracesSampleRate()).toBe(0.25);
  });

  it("falls back when sample rate is invalid", () => {
    vi.stubEnv("SENTRY_TRACES_SAMPLE_RATE", "not-a-number");
    expect(getTracesSampleRate()).toBe(0.1);
  });
});

describe("scrubSentryEvent", () => {
  it("redacts sensitive extra fields and strips user PII", () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: "u1", email: "patient@example.com", username: "2547" },
      extra: { bookingId: "b1", otp: "123456", token: "abc" },
      request: {
        headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
      },
    };

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.user).toEqual({ id: "u1" });
    expect(scrubbed?.extra).toEqual({ bookingId: "b1", otp: "[redacted]", token: "[redacted]" });
    expect(scrubbed?.request?.headers?.Authorization).toBe("[redacted]");
  });
});
