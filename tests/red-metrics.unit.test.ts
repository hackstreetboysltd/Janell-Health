import { afterEach, describe, expect, it } from "vitest";
import {
  getRedMetricsSnapshot,
  recordHttpMetric,
  resetRedMetricsForTests,
} from "@/lib/red-metrics";

describe("red metrics", () => {
  afterEach(() => {
    resetRedMetricsForTests();
  });

  it("tracks requests and error rate", () => {
    recordHttpMetric({
      path: "/api/health",
      method: "GET",
      status: 200,
      durationMs: 40,
    });
    recordHttpMetric({
      path: "/api/bookings",
      method: "POST",
      status: 500,
      durationMs: 120,
    });

    const snap = getRedMetricsSnapshot();
    expect(snap.requests).toBe(2);
    expect(snap.errors).toBe(1);
    expect(snap.errorRatePct).toBe(50);
    expect(snap.latencyMs.p50).toBeGreaterThan(0);
  });
});
