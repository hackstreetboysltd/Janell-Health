import { THEME_INIT_SCRIPT_HASH } from "@/lib/theme-init";

export function createCspNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildContentSecurityPolicy(
  nonce: string,
  opts: { isDev?: boolean } = {},
): string {
  const isDev = opts.isDev ?? process.env.NODE_ENV === "development";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    THEME_INIT_SCRIPT_HASH,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
