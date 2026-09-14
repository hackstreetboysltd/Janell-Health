const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "heif",
  "mif1",
  "msf1",
]);

/** Infer MIME type from magic bytes (not file extension or client Content-Type). */
export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 3) return null;

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (HEIF_BRANDS.has(brand)) {
      return brand === "heif" || brand === "mif1" || brand === "msf1"
        ? "image/heif"
        : "image/heic";
    }
  }

  return null;
}

function normalizeClaimedMime(mime: string): string {
  const trimmed = mime.trim().toLowerCase();
  if (trimmed === "image/jpg") return "image/jpeg";
  return trimmed;
}

function mimeTypesCompatible(detected: string, claimed: string): boolean {
  if (claimed === "application/octet-stream" || !claimed) return true;
  const normalized = normalizeClaimedMime(claimed);
  if (detected === normalized) return true;

  const heifFamily = new Set(["image/heic", "image/heif"]);
  if (heifFamily.has(detected) && heifFamily.has(normalized)) return true;

  return false;
}

export type ValidatedUpload =
  | { ok: true; mimeType: string }
  | { ok: false; error: string };

/** Validate upload bytes against an allowlist; rejects spoofed Content-Type. */
export function validateBinaryUpload(opts: {
  buffer: Buffer;
  claimedMime: string;
  allowedTypes: ReadonlySet<string>;
}): ValidatedUpload {
  const detected = detectMimeFromBuffer(opts.buffer);
  if (!detected) {
    return { ok: false, error: "Unrecognized file type" };
  }

  if (!opts.allowedTypes.has(detected)) {
    return { ok: false, error: "File type not allowed" };
  }

  const claimed = normalizeClaimedMime(opts.claimedMime);
  if (claimed !== "application/octet-stream" && !opts.allowedTypes.has(claimed)) {
    return { ok: false, error: "File type not allowed" };
  }

  if (!mimeTypesCompatible(detected, claimed)) {
    return {
      ok: false,
      error: "File content does not match its declared type",
    };
  }

  return { ok: true, mimeType: detected };
}
