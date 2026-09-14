import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/access/admin";
import { observeApiRequest } from "@/lib/api-observability";
import { purgeExpiredData } from "@/lib/data-retention";

async function postHandler() {
  const session = await auth();
  const admin = await requireAdminSession(session);
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const purged = await purgeExpiredData();
  return NextResponse.json({ ok: true, purged });
}

export async function POST(req: Request) {
  return observeApiRequest(req, postHandler);
}
