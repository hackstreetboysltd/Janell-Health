import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/access/admin";
import { observeApiRequest } from "@/lib/api-observability";
import { getBookingFunnelSnapshot } from "@/lib/booking-funnel";
import { getLaunchMetrics } from "@/lib/metrics";
import { getRedMetricsSnapshot } from "@/lib/red-metrics";

async function getHandler() {
  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const [funnel, launch, red] = await Promise.all([
    getBookingFunnelSnapshot(),
    getLaunchMetrics(),
    Promise.resolve(getRedMetricsSnapshot()),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    funnel,
    launch,
    red,
  });
}

export async function GET(req: Request) {
  return observeApiRequest(req, getHandler);
}
