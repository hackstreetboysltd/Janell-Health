import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INSTITUTION_COOKIE } from "@/lib/referral";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const institution = await prisma.institution.findFirst({
    where: { slug, isActive: true },
  });
  if (!institution) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const url = new URL("/?portal=patient", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(INSTITUTION_COOKIE, slug, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
