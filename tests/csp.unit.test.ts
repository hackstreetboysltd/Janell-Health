import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { THEME_INIT_SCRIPT_HASH } from "@/lib/theme-init";

describe("buildContentSecurityPolicy", () => {
  it("uses nonce and strict-dynamic for scripts without unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("abc123", { isDev: false });
    expect(csp).toContain(
      `script-src 'self' 'nonce-abc123' ${THEME_INIT_SCRIPT_HASH} 'strict-dynamic'`,
    );
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("allows unsafe-eval for scripts in development", () => {
    const csp = buildContentSecurityPolicy("devnonce", { isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
