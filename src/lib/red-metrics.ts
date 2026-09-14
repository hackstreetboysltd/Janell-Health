type HttpSample = {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  at: number;
};

export type RedMetricsSnapshot = {
  windowMs: number;
  requests: number;
  errors: number;
  errorRatePct: number;
  latencyMs: { p50: number; p95: number; max: number };
  recent: Array<{
    path: string;
    method: string;
    status: number;
    durationMs: number;
  }>;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 500;
const samples: HttpSample[] = [];

function prune(now: number) {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0]!.at < cutoff) {
    samples.shift();
  }
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

export function recordHttpMetric(input: {
  path: string;
  method: string;
  status: number;
  durationMs: number;
}) {
  const now = Date.now();
  prune(now);
  samples.push({
    path: input.path,
    method: input.method.toUpperCase(),
    status: input.status,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    at: now,
  });
}

export function getRedMetricsSnapshot(): RedMetricsSnapshot {
  const now = Date.now();
  prune(now);
  const durations = samples.map((s) => s.durationMs);
  const errors = samples.filter((s) => s.status >= 500).length;
  const requests = samples.length;
  return {
    windowMs: WINDOW_MS,
    requests,
    errors,
    errorRatePct: requests === 0 ? 0 : Math.round((errors / requests) * 100),
    latencyMs: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      max: durations.length === 0 ? 0 : Math.max(...durations),
    },
    recent: samples.slice(-10).map(({ path, method, status, durationMs }) => ({
      path,
      method,
      status,
      durationMs,
    })),
  };
}

/** Test-only reset. */
export function resetRedMetricsForTests() {
  samples.length = 0;
}
