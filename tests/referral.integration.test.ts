import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as referralRedirect } from "@/app/api/referral/[slug]/route";
import { INSTITUTION_COOKIE } from "@/lib/referral";
import { canReachDatabase, resetTestData, testPrisma } from "./helpers/db";

vi.mock("@/lib/prisma", async () => {
  const { testPrisma } = await import("./helpers/db");
  return { prisma: testPrisma };
});

const dbReady = await canReachDatabase();
const describeIntegration = dbReady ? describe : describe.skip;

describeIntegration("referral redirect flow", () => {
  beforeEach(async () => {
    await resetTestData();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets institution cookie and redirects to patient portal", async () => {
    await testPrisma.institution.create({
      data: {
        name: "Nairobi General",
        slug: "nairobi-general",
        description: "Partner hospital",
        contactPhone: "+254700000000",
        isActive: true,
      },
    });

    const res = await referralRedirect(
      new Request("http://localhost/api/referral/nairobi-general"),
      { params: Promise.resolve({ slug: "nairobi-general" }) },
    );

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("http://localhost/?portal=patient");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${INSTITUTION_COOKIE}=nairobi-general`);
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("redirects unknown slugs to home without setting a cookie", async () => {
    const res = await referralRedirect(
      new Request("http://localhost/api/referral/unknown-partner"),
      { params: Promise.resolve({ slug: "unknown-partner" }) },
    );

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBe("http://localhost/");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
