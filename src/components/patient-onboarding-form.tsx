"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";

export function PatientOnboardingForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [historyHtml, setHistoryHtml] = useState("<p></p>");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/onboarding/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          age: Number(age),
          diagnosis,
          historyHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile");
        return;
      }
      router.push("/patient");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Full name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
        />
      </Field>
      <Field label="Phone (for booking contact)">
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="field"
          placeholder="07XXXXXXXX"
          inputMode="tel"
        />
      </Field>
      <Field label="Age">
        <input
          required
          type="number"
          min={0}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="field"
        />
      </Field>
      <Field label="Diagnosis">
        <input
          required
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          className="field"
          placeholder="e.g. Type 2 diabetes"
        />
      </Field>
      <Field label="Brief history">
        <RichTextEditor value={historyHtml} onChange={setHistoryHtml} />
      </Field>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-60 md:mt-2"
        >
          {pending ? "Saving…" : "Save and continue"}
        </button>
      </div>
      <style jsx global>{`
        .field {
          margin-top: 0.25rem;
          min-height: 3rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--mist);
          background: var(--white);
          padding: 0.75rem;
        }
        .field:focus {
          outline: 2px solid color-mix(in srgb, var(--sage) 35%, transparent);
          border-color: var(--sage);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-ink/80">
      {label}
      {children}
    </label>
  );
}
