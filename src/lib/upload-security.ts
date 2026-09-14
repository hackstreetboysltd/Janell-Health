import { validateBinaryUpload } from "@/lib/file-type";
import { scanUploadBuffer } from "@/lib/virus-scan";

export type SecureUploadResult =
  | { ok: true; mimeType: string }
  | { ok: false; error: string; status: 400 | 503 };

/** Magic-byte validation plus optional ClamAV malware scan. */
export async function secureBinaryUpload(opts: {
  buffer: Buffer;
  claimedMime: string;
  allowedTypes: ReadonlySet<string>;
}): Promise<SecureUploadResult> {
  const validated = validateBinaryUpload(opts);
  if (!validated.ok) {
    return { ok: false, error: validated.error, status: 400 };
  }

  const scan = await scanUploadBuffer(opts.buffer);
  if (!scan.ok) {
    return {
      ok: false,
      error: scan.message,
      status: scan.reason === "infected" ? 400 : 503,
    };
  }

  return { ok: true, mimeType: validated.mimeType };
}
