import { NextResponse } from "next/server";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { parsePortal } from "@/lib/portals";

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const body = (await req.json()) as { portal?: string };
  const portal = parsePortal(body.portal);
  if (!portal) {
    return NextResponse.json({ error: "Invalid portal" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("carelink_portal", portal, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
