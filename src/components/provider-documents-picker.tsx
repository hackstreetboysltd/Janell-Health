"use client";

import { useState } from "react";
import {
  ALLOWED_PROVIDER_DOC_TYPES,
  MAX_PROVIDER_DOC_BYTES,
  MAX_PROVIDER_DOCUMENTS,
  PROVIDER_DOC_TYPE_LABELS,
} from "@/lib/provider-documents";

export type PendingProviderDoc = {
  file: File;
  documentType: keyof typeof PROVIDER_DOC_TYPE_LABELS;
};

type Props = {
  documents: PendingProviderDoc[];
  onChange: (docs: PendingProviderDoc[]) => void;
  disabled?: boolean;
};

function acceptAttribute() {
  return Array.from(ALLOWED_PROVIDER_DOC_TYPES).join(",");
}

export function ProviderDocumentsPicker({ documents, onChange, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);

  function addFiles(fileList: FileList | null) {
    setError(null);
    if (!fileList?.length) return;

    const next = [...documents];
    for (const file of Array.from(fileList)) {
      if (next.length >= MAX_PROVIDER_DOCUMENTS) {
        setError(`Maximum ${MAX_PROVIDER_DOCUMENTS} documents.`);
        break;
      }
      const mime = file.type || "application/octet-stream";
      if (!ALLOWED_PROVIDER_DOC_TYPES.has(mime)) {
        setError("Only PDF and image files are allowed.");
        continue;
      }
      if (file.size > MAX_PROVIDER_DOC_BYTES) {
        setError("Each file must be 10 MB or less.");
        continue;
      }
      next.push({ file, documentType: "PROFESSION_LICENSE" });
    }
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(documents.filter((_, i) => i !== index));
  }

  function setType(index: number, documentType: PendingProviderDoc["documentType"]) {
    onChange(
      documents.map((doc, i) => (i === index ? { ...doc, documentType } : doc)),
    );
  }

  return (
    <fieldset className="rounded-lg border border-mist bg-white p-3">
      <legend className="px-1 text-sm font-medium text-ink/80">
        Verification documents
      </legend>
      <p className="mt-1 text-xs text-ink/55">
        Upload at least your national ID and professional license. Our team reviews
        before you appear in search.
      </p>
      <input
        type="file"
        accept={acceptAttribute()}
        multiple
        disabled={disabled}
        className="mt-3 block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {documents.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {documents.map((doc, index) => (
            <li
              key={`${doc.file.name}-${index}`}
              className="flex flex-col gap-2 rounded-lg border border-mist/80 px-3 py-2 sm:flex-row sm:items-center"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{doc.file.name}</span>
              <select
                value={doc.documentType}
                disabled={disabled}
                onChange={(e) =>
                  setType(index, e.target.value as PendingProviderDoc["documentType"])
                }
                className="rounded-lg border border-mist bg-white px-2 py-1.5 text-xs"
              >
                {Object.entries(PROVIDER_DOC_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="text-xs font-medium text-alert"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
    </fieldset>
  );
}

export async function uploadProviderDocuments(
  caregiverId: string,
  documents: PendingProviderDoc[],
) {
  for (const doc of documents) {
    const formData = new FormData();
    formData.append("file", doc.file);
    formData.append("documentType", doc.documentType);
    const res = await fetch(`/api/providers/${caregiverId}/documents`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Could not upload ${doc.file.name}`);
    }
  }
}
