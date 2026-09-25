import { Redis } from "@upstash/redis";

/** Vercel marketplace injects KV_*; local/docs use UPSTASH_* (same as Sherehe). */
function upstashRestUrl(): string | undefined {
  const v =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  return v || undefined;
}

function upstashRestToken(): string | undefined {
  const v =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  return v || undefined;
}

/** True when both Upstash REST credentials are present. */
export function upstashConfigured(): boolean {
  return Boolean(upstashRestUrl() && upstashRestToken());
}

let client: Redis | undefined;

/** Singleton Upstash Redis client (REST). Throws if not configured. */
export function getUpstashRedis(): Redis {
  if (!upstashConfigured()) {
    throw new Error("Upstash Redis is not configured");
  }
  if (!client) {
    client = new Redis({
      url: upstashRestUrl()!,
      token: upstashRestToken()!,
    });
  }
  return client;
}

/** Reset cached client — for tests only. */
export function resetUpstashClientForTests() {
  client = undefined;
}

/** Ping Upstash; returns ok/error for health checks. */
export async function upstashHealthCheck(): Promise<"ok" | "error"> {
  if (!upstashConfigured()) return "ok";
  try {
    const pong = await getUpstashRedis().ping();
    return pong === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}
