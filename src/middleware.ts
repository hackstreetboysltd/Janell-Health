import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

const { auth } = NextAuth(authConfig);

const publicExact = new Set([
  "/",
  "/auth/signin",
  "/emergency",
  "/support",
  "/admin",
]);

const publicPrefixes = [
  "/legal/",
  "/referral/",
  "/api/auth",
  "/api/portal",
  "/api/mpesa/callback",
  "/api/referral/",
  "/api/health",
] as const;

function isPublic(pathname: string) {
  if (publicExact.has(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function applySecurityHeaders(
  req: NextRequest,
  response: NextResponse,
  requestHeaders: Headers,
) {
  const nonce = createCspNonce();
  const csp = buildContentSecurityPolicy(nonce, {
    isDev: process.env.NODE_ENV === "development",
  });
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get(REQUEST_ID_HEADER)?.trim() || createRequestId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  function nextWithHeaders(response: NextResponse) {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return applySecurityHeaders(req, response, requestHeaders);
  }

  if (isPublic(pathname)) {
    return nextWithHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  if (!req.auth) {
    const url = req.nextUrl.clone();
    // Deep admin routes send guests to the admin sign-in, not the family portal.
    url.pathname = pathname.startsWith("/admin") ? "/admin" : "/";
    return nextWithHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith("/admin")) {
    const isAdmin =
      req.auth.user?.isAdmin === true || req.auth.user?.role === "ADMIN";
    if (!isAdmin) {
      // Exact /admin is public so the page can show "not an admin" + sign-out.
      // Nested ops pages stay forbidden.
      if (pathname !== "/admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return nextWithHeaders(NextResponse.redirect(url));
      }
    }
  }

  return nextWithHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
