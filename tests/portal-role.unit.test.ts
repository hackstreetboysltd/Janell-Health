import { describe, expect, it } from "vitest";
import {
  portalLandingPath,
  postAuthPath,
  roleForPortalProfile,
  roleFromPortal,
} from "@/lib/portal-role";

describe("roleFromPortal", () => {
  it("maps patient and giver only", () => {
    expect(roleFromPortal("patient")).toBe("PATIENT");
    expect(roleFromPortal("giver")).toBe("CAREGIVER");
    expect(roleFromPortal("admin")).toBeNull();
    expect(roleFromPortal(undefined)).toBeNull();
  });
});

describe("postAuthPath", () => {
  it("routes giver and patient by onboarding state", () => {
    expect(postAuthPath("giver", { onboarded: false })).toBe("/onboarding/giver");
    expect(postAuthPath("giver", { onboarded: true })).toBe("/giver");
    expect(postAuthPath("patient", { onboarded: false })).toBe(
      "/onboarding/patient",
    );
    expect(postAuthPath("patient", { onboarded: true })).toBe("/patient");
  });

  it("sends the admin portal to /admin", () => {
    expect(postAuthPath("admin", { onboarded: true })).toBe("/admin");
  });

  it("keeps an explicit patient or giver choice on the chosen portal", () => {
    expect(postAuthPath("patient", { onboarded: true })).toBe("/patient");
    expect(postAuthPath("giver", { onboarded: false })).toBe("/onboarding/giver");
  });
});

describe("portalLandingPath", () => {
  it("sends each chosen portal to that app, including ops accounts", () => {
    expect(
      portalLandingPath({
        portalHint: "patient",
        role: "ADMIN",
        isAdmin: true,
        onboarded: true,
      }),
    ).toBe("/patient");
    expect(
      portalLandingPath({
        portalHint: "giver",
        role: "ADMIN",
        isAdmin: true,
        onboarded: false,
      }),
    ).toBe("/onboarding/giver");
    expect(
      portalLandingPath({
        portalHint: "admin",
        role: "ADMIN",
        isAdmin: true,
        onboarded: true,
      }),
    ).toBe("/admin");
  });

  it("still opens /admin when an ops account has no portal choice", () => {
    expect(
      portalLandingPath({
        portalHint: null,
        role: "ADMIN",
        isAdmin: true,
        onboarded: true,
      }),
    ).toBe("/admin");
  });
});

describe("roleForPortalProfile", () => {
  it("does not replace ADMIN when a portal profile is saved", () => {
    expect(roleForPortalProfile("ADMIN", "PATIENT")).toBe("ADMIN");
    expect(roleForPortalProfile("ADMIN", "CAREGIVER")).toBe("ADMIN");
    expect(roleForPortalProfile("PATIENT", "CAREGIVER")).toBe("CAREGIVER");
    expect(roleForPortalProfile(null, "PATIENT")).toBe("PATIENT");
  });
});
