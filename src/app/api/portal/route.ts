import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { portal?: string };
  const portal = body.portal === "giver" ? "giver" : body.portal === "patient" ? "patient" : null;
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
