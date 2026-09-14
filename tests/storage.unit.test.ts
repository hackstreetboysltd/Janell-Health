import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCaseStorageKey,
  buildProviderDocumentStorageKey,
  validateStorageKey,
} from "@/lib/storage-keys";
import { createLocalStorageBackend } from "@/lib/storage-backend/local";
import { resetStorageBackendForTests } from "@/lib/storage-backend";

describe("validateStorageKey", () => {
  it("accepts normal relative keys", () => {
    expect(() => validateStorageKey("providers/cg1/doc1-id.pdf")).not.toThrow();
  });

  it("rejects traversal and absolute paths", () => {
    expect(() => validateStorageKey("../etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => validateStorageKey("/etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => validateStorageKey("providers\\doc")).toThrow(/Invalid storage key/);
  });
});

describe("buildCaseStorageKey", () => {
  it("prefixes attachment id and sanitizes file names", () => {
    const key = buildCaseStorageKey("case1", "att1", "my scan (1).pdf");
    expect(key).toBe("case1/att1-my_scan__1_.pdf");
  });
});

describe("buildProviderDocumentStorageKey", () => {
  it("stores under providers/{caregiverId}", () => {
    const key = buildProviderDocumentStorageKey("cg1", "doc1", "license.pdf");
    expect(key).toBe("providers/cg1/doc1-license.pdf");
  });
});

describe("local storage backend", () => {
  let tmpDir = "";

  afterEach(async () => {
    resetStorageBackendForTests();
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = "";
    }
  });

  it("round-trips write, read, and delete", async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "carelink-storage-"));
    const backend = createLocalStorageBackend(tmpDir);
    const key = buildCaseStorageKey("case-abc", "att-xyz", "note.pdf");

    await backend.write(key, Buffer.from("hello"), "application/pdf");
    const data = await backend.read(key);
    expect(data.toString()).toBe("hello");

    await backend.delete(key);
    await expect(backend.read(key)).rejects.toThrow();
  });

  it("blocks path traversal on read", async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "carelink-storage-"));
    const backend = createLocalStorageBackend(tmpDir);
    await expect(backend.read("../outside.txt")).rejects.toThrow(/Invalid storage key/);
  });
});
