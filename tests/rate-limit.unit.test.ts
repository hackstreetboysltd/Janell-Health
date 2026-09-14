import { afterEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn();
const pexpire = vi.fn();
const pttl = vi.fn();

vi.mock("@/lib/upstash", () => ({
  upstashConfigured: vi.fn(),
  getUpstashRedis: vi.fn(() => ({ incr, pexpire, pttl })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitHit: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  rateLimitBackend,
} from "@/lib/rate-limit";
import { upstashConfigured } from "@/lib/upstash";

describe("rateLimitBackend", () => {
  afterEach(() => {
    vi.mocked(upstashConfigured).mockReset();
  });

  it("uses upstash when configured", () => {
    vi.mocked(upstashConfigured).mockReturnValue(true);
    expect(rateLimitBackend()).toBe("upstash");
  });

  it("falls back to postgres", () => {
    vi.mocked(upstashConfigured).mockReturnValue(false);
    expect(rateLimitBackend()).toBe("postgres");
  });
});

describe("consumeRateLimit (upstash)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows hits under the limit and sets TTL on first incr", async () => {
    vi.mocked(upstashConfigured).mockReturnValue(true);
    incr.mockResolvedValueOnce(1);

    const result = await consumeRateLimit({
      bucket: "test:ip",
      limit: 3,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(true);
    expect(pexpire).toHaveBeenCalledWith(expect.stringMatching(/^rl:test:ip:/), 60_000);
  });

  it("blocks when count exceeds limit", async () => {
    vi.mocked(upstashConfigured).mockReturnValue(true);
    incr.mockResolvedValueOnce(4);
    pttl.mockResolvedValueOnce(12_000);

    const result = await consumeRateLimit({
      bucket: "test:ip",
      limit: 3,
      windowMs: 60_000,
    });

    expect(result).toEqual({ ok: false, retryAfterMs: 12_000 });
    expect(prisma.rateLimitHit.create).not.toHaveBeenCalled();
  });
});

describe("consumeRateLimit (postgres fallback)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records a hit when under the limit", async () => {
    vi.mocked(upstashConfigured).mockReturnValue(false);
    vi.mocked(prisma.rateLimitHit.count).mockResolvedValue(0);
    vi.mocked(prisma.rateLimitHit.create).mockResolvedValue({
      id: "1",
      bucket: "pg",
      createdAt: new Date(),
    } as never);

    const result = await consumeRateLimit({
      bucket: "pg",
      limit: 5,
      windowMs: 60_000,
    });

    expect(result.ok).toBe(true);
    expect(prisma.rateLimitHit.create).toHaveBeenCalledWith({
      data: { bucket: "pg" },
    });
    expect(incr).not.toHaveBeenCalled();
  });
});
