import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clamavEnabled,
  clamavRequired,
  parseClamdResponse,
  scanUploadBuffer,
  type MalwareScanner,
} from "@/lib/virus-scan";

describe("parseClamdResponse", () => {
  it("accepts clamd OK responses", () => {
    expect(parseClamdResponse("stream: OK")).toEqual({ ok: true });
    expect(parseClamdResponse("PONG")).toEqual({ ok: true });
  });

  it("rejects FOUND responses as infected", () => {
    const result = parseClamdResponse("stream: Eicar-Test-Signature FOUND");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("infected");
      expect(result.message).toContain("security scan");
    }
  });

  it("treats empty responses as errors", () => {
    const result = parseClamdResponse("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });
});

describe("clamav config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled unless CLAMAV_ENABLED=true", () => {
    vi.stubEnv("CLAMAV_ENABLED", "");
    expect(clamavEnabled()).toBe(false);
    vi.stubEnv("CLAMAV_ENABLED", "true");
    expect(clamavEnabled()).toBe(true);
  });

  it("requires scanner in production when enabled", () => {
    vi.stubEnv("CLAMAV_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLAMAV_REQUIRED", "");
    expect(clamavRequired()).toBe(true);
  });

  it("allows optional scanning in development", () => {
    vi.stubEnv("CLAMAV_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLAMAV_REQUIRED", "");
    expect(clamavRequired()).toBe(false);
  });
});

describe("scanUploadBuffer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips when ClamAV is disabled", async () => {
    vi.stubEnv("CLAMAV_ENABLED", "false");
    const scanner: MalwareScanner = vi.fn(async () => ({
      ok: false as const,
      reason: "infected" as const,
      message: "infected",
    }));
    await expect(scanUploadBuffer(Buffer.from("x"), scanner)).resolves.toEqual({ ok: true });
    expect(scanner).not.toHaveBeenCalled();
  });

  it("blocks infected files when scanning is required", async () => {
    vi.stubEnv("CLAMAV_ENABLED", "true");
    vi.stubEnv("CLAMAV_REQUIRED", "true");
    const scanner: MalwareScanner = async () => ({
      ok: false,
      reason: "infected",
      message: "File failed security scan",
    });
    const result = await scanUploadBuffer(Buffer.from("bad"), scanner);
    expect(result).toEqual({
      ok: false,
      reason: "infected",
      message: "File failed security scan",
    });
  });

  it("allows uploads when scanner is down but not required", async () => {
    vi.stubEnv("CLAMAV_ENABLED", "true");
    vi.stubEnv("CLAMAV_REQUIRED", "false");
    const scanner: MalwareScanner = async () => ({
      ok: false,
      reason: "unavailable",
      message: "Upload scanning is temporarily unavailable",
    });
    await expect(scanUploadBuffer(Buffer.from("x"), scanner)).resolves.toEqual({ ok: true });
  });
});
