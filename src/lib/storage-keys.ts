import path from "node:path";

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]/g;

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(SAFE_NAME_RE, "_").slice(0, 120);
}

/** Reject traversal and absolute paths — keys are always POSIX object paths. */
export function validateStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.length > 512) {
    throw new Error("Invalid storage key");
  }
  if (
    storageKey.includes("..") ||
    storageKey.includes("\\") ||
    path.posix.isAbsolute(storageKey) ||
    storageKey.startsWith("/")
  ) {
    throw new Error("Invalid storage key");
  }
}

export function buildCaseStorageKey(
  caseId: string,
  attachmentId: string,
  fileName: string,
): string {
  const key = path.posix.join(
    caseId,
    `${attachmentId}-${sanitizeFileName(fileName)}`,
  );
  validateStorageKey(key);
  return key;
}

export function buildProviderDocumentStorageKey(
  caregiverId: string,
  documentId: string,
  fileName: string,
): string {
  const key = path.posix.join(
    "providers",
    caregiverId,
    `${documentId}-${sanitizeFileName(fileName)}`,
  );
  validateStorageKey(key);
  return key;
}
