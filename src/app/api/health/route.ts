import { NextResponse } from "next/server";
import { observeApiRequest } from "@/lib/api-observability";
import { prisma } from "@/lib/prisma";
import { rateLimitBackend } from "@/lib/rate-limit";
import { storageDriver } from "@/lib/storage";
import { upstashConfigured, upstashHealthCheck } from "@/lib/upstash";
import { clamavEnabled, clamavHealthCheck } from "@/lib/virus-scan";

async function getHandler() {
  const checks: Record<string, "ok" | "error" | "skipped"> = {
    database: "error",
    storage: "ok",
    redis: "skipped",
    clamav: "skipped",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  if (storageDriver() === "s3") {
    const missing = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter(
      (key) => !process.env[key]?.trim(),
    );
    if (missing.length > 0) checks.storage = "error";
  }

  if (upstashConfigured()) {
    checks.redis = await upstashHealthCheck();
  }

  if (clamavEnabled()) {
    checks.clamav = await clamavHealthCheck();
  }

  const requiredChecks = Object.entries(checks).filter(([, status]) => status !== "skipped");
  const healthy = requiredChecks.every(([, status]) => status === "ok");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      storage: storageDriver(),
      rateLimit: rateLimitBackend(),
      clamav: clamavEnabled(),
    },
    { status: healthy ? 200 : 503 },
  );
}

export async function GET(req: Request) {
  return observeApiRequest(req, getHandler);
}
