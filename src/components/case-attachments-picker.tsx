"use client";

import { useRef, useState } from "react";
import {
  ALLOWED_ATTACHMENT_TYPES,
  formatAttachmentSize,
  MAX_ATTACHMENT_BYTES,
  MAX_CASE_ATTACHMENTS,
} from "@/lib/case-attachments";
import { ModuleAddButton } from "@/components/module-heading";

function acceptAttribute() {
  return Array.from(ALLOWED_ATTACHMENT_TYPES).join(",");
}

export function CaseAttachmentsPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(next: FileList | null) {
    if (!next?.length) return;
    setError(null);

    const merged = [...files];
    for (const file of Array.from(next)) {
      if (merged.length >= MAX_CASE_ATTACHMENTS) {
        setError(`You can attach up to ${MAX_CASE_ATTACHMENTS} files.`);
        break;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`${file.name} exceeds the 10 MB limit.`);
        continue;
      }
      const mimeType = file.type || "application/octet-stream";
      if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
        setError(`${file.name} is not a supported PDF or image file.`);
        continue;
      }
      if (merged.some((existing) => existing.name === file.name && existing.size === file.size)) {
        continue;
      }
      merged.push(file);
    }
    onChange(merged);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink/80">Examination files</p>
        <ModuleAddButton
          label="Add file"
          disabled={disabled || files.length >= MAX_CASE_ATTACHMENTS}
          onClick={() => inputRef.current?.click()}
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute()}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-mist bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-ink/50">{formatAttachmentSize(file.size)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="shrink-0 text-sm text-alert"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-dashed border-mist bg-white/60 px-4 py-6 text-center text-sm text-ink/55 disabled:opacity-50"
        >
          Tap to add images and other relevant files for examination
        </button>
      )}
      {error ? <p className="text-sm text-alert">{error}</p> : null}
    </div>
  );
}

export async function uploadCaseAttachments(caseId: string, files: File[]) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/cases/${caseId}/attachments`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Could not upload ${file.name}`);
    }
  }
}
