import { attachRequestId, getRequestId } from "@/lib/request-id";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { recordHttpMetric } from "@/lib/red-metrics";
import { logger } from "@/lib/logger";

function normalizeApiPath(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "/:id",
      )
      .replace(/\/c[a-z0-9]{20,}/gi, "/:id");
  } catch {
    return "/unknown";
  }
}

function tagSentryRequest(requestId: string) {
  if (typeof window !== "undefined") return;
  if (!process.env.SENTRY_DSN?.trim()) return;
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.setTag("request_id", requestId);
    })
    .catch(() => {});
}

/** Wrap an API route handler with request ID, RED metrics, and structured access logs. */
export function observeApiRequest(
  req: Request,
  handler: (req: Request) => Promise<Response>,
): Promise<Response> {
  const requestId = getRequestId(req);
  const path = normalizeApiPath(req.url);
  const method = req.method.toUpperCase();
  const start = performance.now();
  tagSentryRequest(requestId);

  return enforceApiRateLimits(req)
    .then((blocked) => {
      if (blocked) {
        const durationMs = performance.now() - start;
        recordHttpMetric({ path, method, status: blocked.status, durationMs });
        logger.warn("http.request.rate_limited", {
          requestId,
          path,
          method,
          durationMs: Math.round(durationMs),
        });
        return attachRequestId(blocked, requestId);
      }
      return handler(req);
    })
    .then((response) => {
      const durationMs = performance.now() - start;
      recordHttpMetric({ path, method, status: response.status, durationMs });
      logger.info("http.request", {
        requestId,
        path,
        method,
        status: response.status,
        durationMs: Math.round(durationMs),
      });
      return attachRequestId(response, requestId);
    })
    .catch((error: unknown) => {
      const durationMs = performance.now() - start;
      recordHttpMetric({ path, method, status: 500, durationMs });
      logger.error("http.request.error", {
        requestId,
        path,
        method,
        durationMs: Math.round(durationMs),
        error: error instanceof Error ? error.message : "unknown",
      });
      tagSentryRequest(requestId);
      throw error;
    });
}
