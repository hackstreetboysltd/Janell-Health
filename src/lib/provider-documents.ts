export const ALLOWED_PROVIDER_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_PROVIDER_DOC_BYTES = 10 * 1024 * 1024;
export const MAX_PROVIDER_DOCUMENTS = 6;
export const MIN_DOCUMENTS_FOR_REVIEW = 2;

export const PROVIDER_DOC_TYPE_LABELS = {
  NATIONAL_ID: "National ID / passport",
  PROFESSION_LICENSE: "Professional license / registration",
  CERTIFICATE: "Certificate",
  OTHER: "Other",
} as const;
