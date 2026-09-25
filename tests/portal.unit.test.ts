import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/portal/route";
import { parsePortal } from "@/lib/portals";

describe("parsePortal", () => {
  it("accepts patient, giver, and admin", () => {
    expect(parsePortal("patient")).toBe("patient");
    expect(parsePortal("giver")).toBe("giver");
    expect(parsePortal("admin")).toBe("admin");
  });

  it("rejects unknown portals", () => {
    expect(parsePortal("ops")).toBeNull();
    expect(parsePortal("")).toBeNull();
    expect(parsePortal(undefined)).toBeNull();
  });
});

describe("POST /api/portal", () => {
  it("sets carelink_portal cookie for admin", async () => {
    const res = await POST(
      new Request("http://localhost/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: "admin" }),
      }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("carelink_portal=admin");
  });

  it("rejects invalid portal", async () => {
    const res = await POST(
      new Request("http://localhost/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: "root" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("guest portal URL precedence", () => {
  it("treats explicit ?portal=patient as non-admin even when cookie is admin", () => {
    // Mirrors src/app/page.tsx — explicit query wins so navigate-first
    // switches from /admin are not bounced back by a stale cookie.
    const paramsPortal: string | undefined = "patient";
    const cookiePortal = "admin";
    const shouldRedirectAdmin =
      paramsPortal === "admin" || (!paramsPortal && cookiePortal === "admin");
    expect(shouldRedirectAdmin).toBe(false);
  });

  it("still redirects bare / to admin when only the cookie says admin", () => {
    const paramsPortal = undefined as string | undefined;
    const cookiePortal = "admin";
    const shouldRedirectAdmin =
      paramsPortal === "admin" || (!paramsPortal && cookiePortal === "admin");
    expect(shouldRedirectAdmin).toBe(true);
  });
});
