import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageBackend, SignedReadOptions } from "@/lib/storage-backend/types";
import { validateStorageKey } from "@/lib/storage-keys";

type S3BackendConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
};

export function createS3StorageBackend(config: S3BackendConfig): StorageBackend {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    kind: "s3",
    async write(storageKey, data, contentType) {
      validateStorageKey(storageKey);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
          Body: data,
          ContentType: contentType ?? "application/octet-stream",
        }),
      );
    },
    async read(storageKey) {
      validateStorageKey(storageKey);
      const response = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
        }),
      );
      if (!response.Body) {
        throw new Error("Object not found");
      }
      return Buffer.from(await response.Body.transformToByteArray());
    },
    async delete(storageKey) {
      validateStorageKey(storageKey);
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
        }),
      );
    },
    async getSignedReadUrl(storageKey, opts: SignedReadOptions) {
      validateStorageKey(storageKey);
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: `inline; filename="${opts.fileName.replace(/"/g, "")}"`,
      });
      return getSignedUrl(client, command, {
        expiresIn: opts.expiresInSeconds ?? 300,
      });
    },
  };
}

export function s3ConfigFromEnv():
  | { ok: true; config: S3BackendConfig }
  | { ok: false; error: string } {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return { ok: false, error: "S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY are required" };
  }

  return {
    ok: true,
    config: {
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    },
  };
}
