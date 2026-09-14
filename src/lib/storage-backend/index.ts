import path from "node:path";
import { createLocalStorageBackend } from "@/lib/storage-backend/local";
import { createS3StorageBackend, s3ConfigFromEnv } from "@/lib/storage-backend/s3";
import type { StorageBackend } from "@/lib/storage-backend/types";

export type StorageDriver = "local" | "s3";

export function storageDriver(): StorageDriver {
  return process.env.STORAGE_BACKEND === "s3" ? "s3" : "local";
}

let backend: StorageBackend | undefined;

export function getStorageBackend(): StorageBackend {
  if (backend) return backend;

  if (storageDriver() === "s3") {
    const parsed = s3ConfigFromEnv();
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    backend = createS3StorageBackend(parsed.config);
    return backend;
  }

  const uploadRoot =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  backend = createLocalStorageBackend(uploadRoot);
  return backend;
}

/** Reset cached backend — for tests only. */
export function resetStorageBackendForTests() {
  backend = undefined;
}
