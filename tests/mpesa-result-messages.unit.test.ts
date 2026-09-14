import { describe, expect, it } from "vitest";
import { mpesaResultMessage } from "@/lib/mpesa-result-messages";

describe("mpesaResultMessage", () => {
  it("maps known Safaricom STK result codes", () => {
    expect(mpesaResultMessage(1032)).toContain("cancelled");
    expect(mpesaResultMessage(1037)).toContain("timed out");
    expect(mpesaResultMessage(2001)).toContain("PIN");
  });

  it("uses fallback for unknown codes", () => {
    expect(mpesaResultMessage(9999, "Custom fallback")).toBe("Custom fallback");
  });

  it("uses fallback when code is null", () => {
    expect(mpesaResultMessage(null)).toContain("cancelled");
  });
});
