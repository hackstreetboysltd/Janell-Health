import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEY = /password|secret|token|otp|authorization|cookie|msisdn|phone/i;

/** True when `SENTRY_DSN` is set — Sentry stays off in local dev without a DSN. */
export function sentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

/** Parse `SENTRY_TRACES_SAMPLE_RATE` (0–1). Defaults to 0.1 in production, 0 otherwise. */
export function getTracesSampleRate(): number {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? 0.1 : 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.1;
  return n;
}

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (typeof value === "string" && value.length > 240) {
    return `${value.slice(0, 240)}…`;
  }
  return value;
}

function scrubObject(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = scrubObject(value as Record<string, unknown>);
    } else {
      out[key] = scrubValue(key, value);
    }
  }
  return out;
}

/** Strip PII and secrets before events leave the app. */
export function scrubSentryEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  void hint;
  if (event.user) {
    event.user = {
      id: event.user.id,
    };
  }
  if (event.request?.headers) {
    event.request.headers = scrubObject(
      event.request.headers as Record<string, unknown>,
    ) as typeof event.request.headers;
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra as Record<string, unknown>);
  }
  if (event.contexts) {
    for (const [name, ctx] of Object.entries(event.contexts)) {
      if (ctx && typeof ctx === "object") {
        event.contexts[name] = scrubObject(ctx as Record<string, unknown>);
      }
    }
  }
  return event;
}

export function buildSentryOptions() {
  return {
    dsn: process.env.SENTRY_DSN,
    enabled: sentryEnabled(),
    environment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    tracesSampleRate: getTracesSampleRate(),
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  };
}
