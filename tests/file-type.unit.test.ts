import { describe, expect, it } from "vitest";
import {
  detectMimeFromBuffer,
  validateBinaryUpload,
} from "@/lib/file-type";
import { ALLOWED_ATTACHMENT_TYPES } from "@/lib/case-attachments";
import { ALLOWED_PROVIDER_DOC_TYPES } from "@/lib/provider-documents";

const PDF = Buffer.from("%PDF-1.4\n");
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBP"),
]);
const EXE = Buffer.from("MZ");

describe("detectMimeFromBuffer", () => {
  it("detects PDF, JPEG, PNG, and WEBP", () => {
    expect(detectMimeFromBuffer(PDF)).toBe("application/pdf");
    expect(detectMimeFromBuffer(JPEG)).toBe("image/jpeg");
    expect(detectMimeFromBuffer(PNG)).toBe("image/png");
    expect(detectMimeFromBuffer(WEBP)).toBe("image/webp");
  });

  it("returns null for unknown content", () => {
    expect(detectMimeFromBuffer(EXE)).toBeNull();
    expect(detectMimeFromBuffer(Buffer.from("hello"))).toBeNull();
  });
});

describe("validateBinaryUpload", () => {
  it("accepts matching PDF uploads", () => {
    const result = validateBinaryUpload({
      buffer: PDF,
      claimedMime: "application/pdf",
      allowedTypes: ALLOWED_PROVIDER_DOC_TYPES,
    });
    expect(result).toEqual({ ok: true, mimeType: "application/pdf" });
  });

  it("rejects executable content disguised as PDF", () => {
    const result = validateBinaryUpload({
      buffer: EXE,
      claimedMime: "application/pdf",
      allowedTypes: ALLOWED_PROVIDER_DOC_TYPES,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Unrecognized file type");
    }
  });

  it("rejects PNG bytes with a PDF Content-Type", () => {
    const result = validateBinaryUpload({
      buffer: PNG,
      claimedMime: "application/pdf",
      allowedTypes: ALLOWED_ATTACHMENT_TYPES,
    });
    expect(result).toEqual({
      ok: false,
      error: "File content does not match its declared type",
    });
  });

  it("allows octet-stream when bytes match an allowed type", () => {
    const result = validateBinaryUpload({
      buffer: JPEG,
      claimedMime: "application/octet-stream",
      allowedTypes: ALLOWED_ATTACHMENT_TYPES,
    });
    expect(result).toEqual({ ok: true, mimeType: "image/jpeg" });
  });

  it("rejects HEIC for provider documents", () => {
    const heic = Buffer.concat([
      Buffer.alloc(4),
      Buffer.from("ftyp"),
      Buffer.from("heic"),
    ]);
    const result = validateBinaryUpload({
      buffer: heic,
      claimedMime: "image/heic",
      allowedTypes: ALLOWED_PROVIDER_DOC_TYPES,
    });
    expect(result.ok).toBe(false);
  });
});
