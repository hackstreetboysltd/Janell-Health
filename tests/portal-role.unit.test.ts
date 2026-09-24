import { describe, expect, it } from "vitest";
import { postAuthPath, roleFromPortal } from "@/lib/portal-role";

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

  it("sends admin to /admin", () => {
    expect(postAuthPath("admin", { onboarded: true })).toBe("/admin");
    expect(postAuthPath("patient", { onboarded: true, isAdmin: true })).toBe(
      "/admin",
    );
  });
});
