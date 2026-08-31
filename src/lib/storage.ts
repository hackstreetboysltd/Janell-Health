import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export function getUploadRoot() {
  return UPLOAD_ROOT;
}

export function resolveStoragePath(storageKey: string) {
  const resolved = path.resolve(UPLOAD_ROOT, storageKey);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function saveCaseFile(
  caseId: string,
  attachmentId: string,
  fileName: string,
  data: Buffer,
) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const storageKey = path.join(caseId, `${attachmentId}-${safeName}`);
  const fullPath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
  return storageKey;
}

export async function readCaseFile(storageKey: string) {
  return readFile(resolveStoragePath(storageKey));
}

export async function deleteCaseFile(storageKey: string) {
  await unlink(resolveStoragePath(storageKey));
}
