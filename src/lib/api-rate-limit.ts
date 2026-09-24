import { NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/client-ip";
import { consumeRateLimit, type RateLimitResult } from "@/lib/rate-limit";

export type ApiRateLimitScope = "global" | "auth" | "upload" | "bookingCreate";

export const API_RATE_LIMIT_POLICIES: Record<
  ApiRateLimitScope,
  { limit: number; windowMs: number }
> = {
  global: { limit: 200, windowMs: 15 * 60 * 1000 },
  auth: { limit: 30, windowMs: 15 * 60 * 1000 },
  upload: { limit: 20, windowMs: 60 * 60 * 1000 },
  bookingCreate: { limit: 10, windowMs: 60 * 60 * 1000 },
};

const EXEMPT_PATH_PREFIXES = [
  "/api/health",
  "/api/mpesa/callback",
  // Preference cookie only — skip Upstash so portal switches stay snappy.
  "/api/portal",
] as const;

const AUTH_PATH_PREFIXES = ["/api/auth"] as const;

/** Disable in tests unless explicitly enabled; on in all other environments. */
export function apiRateLimitEnabled(): boolean {
  if (process.env.API_RATE_LIMIT_ENABLED === "false") return false;
  if (process.env.API_RATE_LIMIT_ENABLED === "true") return true;
  return process.env.NODE_ENV !== "test";
}

function requestPathname(req: Request): string {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "";
  }
}

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isMutationMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

/** Map an API request to rate-limit scopes (IP buckets). */
export function scopesForApiRequest(req: Request): ApiRateLimitScope[] {
  const pathname = requestPathname(req);
  const method = req.method.toUpperCase();

  if (!pathname.startsWith("/api/") || isExemptPath(pathname)) {
    return [];
  }

  const scopes: ApiRateLimitScope[] = ["global"];

  if (AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    scopes.push("auth");
  }

  if (!isMutationMethod(method)) {
    return scopes;
  }

  if (
    pathname.endsWith("/attachments") ||
    (pathname.includes("/documents") && method === "POST")
  ) {
    scopes.push("upload");
  }

  if (pathname === "/api/bookings" || pathname === "/api/cases") {
    scopes.push("bookingCreate");
  }

  return scopes;
}

function ipBucket(scope: ApiRateLimitScope, ip: string): string {
  return `api:${scope}:ip:${ip}`;
}

function userBucket(scope: ApiRateLimitScope, userId: string): string {
  return `api:${scope}:user:${userId}`;
}

function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

async function consumeScope(
  bucket: string,
  scope: ApiRateLimitScope,
): Promise<RateLimitResult> {
  const policy = API_RATE_LIMIT_POLICIES[scope];
  return consumeRateLimit({
    bucket,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });
}

/** Enforce IP-scoped limits for this request. Returns a 429 response when blocked. */
export async function enforceApiRateLimits(req: Request): Promise<Response | null> {
  if (!apiRateLimitEnabled()) return null;

  const scopes = scopesForApiRequest(req);
  if (scopes.length === 0) return null;

  const ip = clientIpFromRequest(req);
  for (const scope of scopes) {
    const result = await consumeScope(ipBucket(scope, ip), scope);
    if (!result.ok) {
      return rateLimitResponse(result);
    }
  }

  return null;
}

/** Per-user cap for authenticated write endpoints (booking/case creation). */
export async function enforceUserApiRateLimit(
  userId: string,
  scope: "bookingCreate",
): Promise<Response | null> {
  if (!apiRateLimitEnabled()) return null;

  const result = await consumeScope(userBucket(scope, userId), scope);
  if (!result.ok) {
    return rateLimitResponse(result);
  }
  return null;
}
