import { describe, expect, it, vi, afterEach } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/storage", () => ({
  storageDriver: vi.fn(() => "local"),
}));

vi.mock("@/lib/upstash", () => ({
  upstashConfigured: vi.fn(() => false),
  upstashHealthCheck: vi.fn(async () => "ok" as const),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitBackend: vi.fn(() => "postgres" as const),
}));

import { prisma } from "@/lib/prisma";
import { storageDriver } from "@/lib/storage";
import { upstashConfigured, upstashHealthCheck } from "@/lib/upstash";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.mocked(upstashConfigured).mockReturnValue(false);
  });

  it("returns ok when database is reachable", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(storageDriver).mockReturnValue("local");

    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.redis).toBe("skipped");
    expect(body.rateLimit).toBe("postgres");
  });

  it("returns degraded when database is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("db down"));
    vi.mocked(storageDriver).mockReturnValue("local");

    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe("error");
  });

  it("probes redis when Upstash is configured", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(storageDriver).mockReturnValue("local");
    vi.mocked(upstashConfigured).mockReturnValue(true);
    vi.mocked(upstashHealthCheck).mockResolvedValue("ok");

    const res = await GET(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks.redis).toBe("ok");
  });
});
