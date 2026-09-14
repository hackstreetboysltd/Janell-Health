import { NextResponse } from "next/server";
import {
  buildCaseStorageKey,
  buildProviderDocumentStorageKey,
} from "@/lib/storage-keys";
import {
  getStorageBackend,
  storageDriver,
} from "@/lib/storage-backend";
import type { SignedReadOptions } from "@/lib/storage-backend/types";

export function getUploadRoot() {
  return process.env.UPLOAD_DIR ?? "uploads";
}

export async function saveCaseFile(
  caseId: string,
  attachmentId: string,
  fileName: string,
  data: Buffer,
  contentType?: string,
) {
  const storageKey = buildCaseStorageKey(caseId, attachmentId, fileName);
  await getStorageBackend().write(storageKey, data, contentType);
  return storageKey;
}

export async function readCaseFile(storageKey: string) {
  return getStorageBackend().read(storageKey);
}

export async function deleteCaseFile(storageKey: string) {
  await getStorageBackend().delete(storageKey);
}

export async function saveProviderDocumentFile(
  caregiverId: string,
  documentId: string,
  fileName: string,
  data: Buffer,
  contentType?: string,
) {
  const storageKey = buildProviderDocumentStorageKey(
    caregiverId,
    documentId,
    fileName,
  );
  await getStorageBackend().write(storageKey, data, contentType);
  return storageKey;
}

export async function readProviderDocumentFile(storageKey: string) {
  return getStorageBackend().read(storageKey);
}

export async function deleteProviderDocumentFile(storageKey: string) {
  await getStorageBackend().delete(storageKey);
}

/** Stream from disk or redirect to a short-lived signed object URL (S3/R2). */
export async function storedFileResponse(
  storageKey: string,
  opts: SignedReadOptions,
): Promise<NextResponse> {
  const backend = getStorageBackend();
  const signed = await backend.getSignedReadUrl?.(storageKey, opts);
  if (signed) {
    return NextResponse.redirect(signed, 307);
  }

  const data = await backend.read(storageKey);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": opts.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(opts.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export { storageDriver };
