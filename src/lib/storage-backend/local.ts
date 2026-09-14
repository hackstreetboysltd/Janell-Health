import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageBackend } from "@/lib/storage-backend/types";
import { validateStorageKey } from "@/lib/storage-keys";

export function createLocalStorageBackend(uploadRoot: string): StorageBackend {
  const root = path.resolve(uploadRoot);

  function resolvePath(storageKey: string): string {
    validateStorageKey(storageKey);
    const resolved = path.resolve(root, storageKey);
    const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (!resolved.startsWith(rootWithSep) && resolved !== root) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  return {
    kind: "local",
    async write(storageKey, data) {
      const fullPath = resolvePath(storageKey);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, data);
    },
    async read(storageKey) {
      return readFile(resolvePath(storageKey));
    },
    async delete(storageKey) {
      await unlink(resolvePath(storageKey));
    },
  };
}
