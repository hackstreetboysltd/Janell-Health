import { afterEach, describe, expect, it, vi } from "vitest";
import { secureBinaryUpload } from "@/lib/upload-security";
import * as virusScan from "@/lib/virus-scan";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const ALLOWED = new Set(["image/jpeg"]);

describe("secureBinaryUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects files that fail magic-byte validation", async () => {
    const result = await secureBinaryUpload({
      buffer: Buffer.from("not-a-real-image"),
      claimedMime: "image/jpeg",
      allowedTypes: ALLOWED,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("Unrecognized");
    }
  });

  it("returns 400 when malware is detected", async () => {
    vi.spyOn(virusScan, "scanUploadBuffer").mockResolvedValue({
      ok: false,
      reason: "infected",
      message: "File failed security scan",
    });

    const result = await secureBinaryUpload({
      buffer: JPEG,
      claimedMime: "image/jpeg",
      allowedTypes: ALLOWED,
    });
    expect(result).toEqual({
      ok: false,
      error: "File failed security scan",
      status: 400,
    });
  });

  it("returns 503 when scanner is required but unavailable", async () => {
    vi.spyOn(virusScan, "scanUploadBuffer").mockResolvedValue({
      ok: false,
      reason: "unavailable",
      message: "Upload scanning is temporarily unavailable",
    });

    const result = await secureBinaryUpload({
      buffer: JPEG,
      claimedMime: "image/jpeg",
      allowedTypes: ALLOWED,
    });
    expect(result).toEqual({
      ok: false,
      error: "Upload scanning is temporarily unavailable",
      status: 503,
    });
  });
});
