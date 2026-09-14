import { describe, expect, it } from "vitest";
import {
  attachRequestId,
  createRequestId,
  getRequestId,
} from "@/lib/request-id";

describe("request id", () => {
  it("reuses an incoming x-request-id", () => {
    const req = new Request("http://localhost/api/health", {
      headers: { "x-request-id": "req-abc" },
    });
    expect(getRequestId(req)).toBe("req-abc");
  });

  it("mints an id when header is missing", () => {
    const id = getRequestId(new Request("http://localhost/"));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("attaches x-request-id to responses", () => {
    const res = attachRequestId(new Response("ok"), "trace-1");
    expect(res.headers.get("x-request-id")).toBe("trace-1");
  });
});
