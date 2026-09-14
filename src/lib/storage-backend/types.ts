export type SignedReadOptions = {
  contentType: string;
  fileName: string;
  expiresInSeconds?: number;
};

export type StorageBackend = {
  readonly kind: "local" | "s3";
  write(storageKey: string, data: Buffer, contentType?: string): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getSignedReadUrl?(
    storageKey: string,
    opts: SignedReadOptions,
  ): Promise<string | null>;
};
