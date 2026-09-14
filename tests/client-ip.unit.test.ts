import { describe, expect, it } from "vitest";
import { clientIpFromRequest } from "@/lib/client-ip";

describe("clientIpFromRequest", () => {
  it("uses the first X-Forwarded-For address", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(clientIpFromRequest(req)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip then unknown", () => {
    const real = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.2" },
    });
    expect(clientIpFromRequest(real)).toBe("198.51.100.2");

    expect(clientIpFromRequest(new Request("http://localhost/"))).toBe("unknown");
  });
});
