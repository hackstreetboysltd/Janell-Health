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
