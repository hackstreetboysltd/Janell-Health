"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CaseAttachmentsPicker,
  uploadCaseAttachments,
} from "@/components/case-attachments-picker";
import { RichTextEditor } from "@/components/rich-text-editor";

export function NewCaseForm({
  services,
}: {
  services: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [wantHtml, setWantHtml] = useState("<p></p>");
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wantHtml, services: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create case");
        return;
      }
      if (files.length > 0) {
        try {
          await uploadCaseAttachments(data.id, files);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Case created but some files failed to upload",
          );
          router.push(`/patient/find?caseId=${data.id}`);
          router.refresh();
          return;
        }
      }
      router.push(`/patient/find?caseId=${data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <CaseAttachmentsPicker files={files} onChange={setFiles} disabled={pending} />
      <label className="block text-sm font-medium text-ink/80">
        What you want
        <div className="mt-1">
          <RichTextEditor
            value={wantHtml}
            onChange={setWantHtml}
            placeholder="Describe the visit you need…"
          />
        </div>
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-ink/80">
          Special requirements (prescription services)
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {services.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`min-h-10 rounded-lg border px-3 text-sm ${
                  on ? "border-sage bg-sage text-white" : "border-mist bg-white"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending || selected.length === 0}
          className="min-h-12 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-50"
        >
          {pending
            ? files.length > 0
              ? "Uploading…"
              : "Creating…"
            : "Continue to map"}
        </button>
      </div>
    </form>
  );
}
