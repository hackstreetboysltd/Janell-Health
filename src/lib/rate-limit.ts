import { prisma } from "@/lib/prisma";
import { getUpstashRedis, upstashConfigured } from "@/lib/upstash";

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export type RateLimitBackend = "upstash" | "postgres";

/** Prefer Upstash when configured; otherwise Postgres `RateLimitHit`. */
export function rateLimitBackend(): RateLimitBackend {
  return upstashConfigured() ? "upstash" : "postgres";
}

/**
 * Fixed-window rate limit shared across serverless instances.
 * Uses Upstash Redis when `UPSTASH_REDIS_REST_*` are set; otherwise Postgres.
 */
export async function consumeRateLimit(opts: {
  bucket: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (rateLimitBackend() === "upstash") {
    return consumeUpstashRateLimit(opts);
  }
  return consumePostgresRateLimit(opts);
}

async function consumeUpstashRateLimit(opts: {
  bucket: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const redis = getUpstashRedis();
  const windowId = Math.floor(Date.now() / opts.windowMs);
  const key = `rl:${opts.bucket}:${windowId}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.pexpire(key, opts.windowMs);
  }

  if (count > opts.limit) {
    const ttl = await redis.pttl(key);
    const retryAfterMs =
      ttl > 0 ? ttl : Math.max(0, opts.windowMs - (Date.now() % opts.windowMs));
    return { ok: false, retryAfterMs };
  }

  return { ok: true };
}

/**
 * Postgres-backed fixed-window rate limit (works across app instances).
 * Records a hit only when under the limit.
 */
async function consumePostgresRateLimit(opts: {
  bucket: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const since = new Date(Date.now() - opts.windowMs);
  const count = await prisma.rateLimitHit.count({
    where: { bucket: opts.bucket, createdAt: { gte: since } },
  });

  if (count >= opts.limit) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { bucket: opts.bucket, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterMs = oldest
      ? Math.max(0, opts.windowMs - (Date.now() - oldest.createdAt.getTime()))
      : opts.windowMs;
    return { ok: false, retryAfterMs };
  }

  await prisma.rateLimitHit.create({ data: { bucket: opts.bucket } });

  // Best-effort trim — keeps the table bounded without a cron job.
  if (count > 0 && count % 50 === 0) {
    await prisma.rateLimitHit.deleteMany({
      where: { createdAt: { lt: since } },
    });
  }

  return { ok: true };
}

/** OTP send: max requests per IP per hour (complements per-phone limits in otp.ts). */
export const OTP_SEND_IP_LIMIT = 30;
export const OTP_SEND_IP_WINDOW_MS = 60 * 60 * 1000;

export function otpSendIpBucket(ip: string): string {
  return `otp-send:ip:${ip}`;
}
