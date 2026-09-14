import { Redis } from "@upstash/redis";

/** True when both Upstash REST credentials are present. */
export function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let client: Redis | undefined;

/** Singleton Upstash Redis client (REST). Throws if not configured. */
export function getUpstashRedis(): Redis {
  if (!upstashConfigured()) {
    throw new Error("Upstash Redis is not configured");
  }
  if (!client) {
    client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
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
