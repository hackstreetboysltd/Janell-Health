"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState, useTransition } from "react";
import { FormErrorAlert } from "@/components/form-error-alert";
import { useFormDraft } from "@/hooks/use-form-draft";
import { AGE_BANDS } from "@/lib/care-categories";
import { FORM_DRAFT_KEYS } from "@/lib/form-draft";

export function PatientOnboardingForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const { update: refreshSession } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [ageBand, setAgeBand] =
    useState<(typeof AGE_BANDS)[number]["id"]>("ADULT");

  const draftSnapshot = useMemo(
    () => ({ name, phone, ageBand }),
    [name, phone, ageBand],
  );

  const { clearDraft } = useFormDraft(
    FORM_DRAFT_KEYS.patientOnboarding,
    draftSnapshot,
    (draft) => {
      if (typeof draft.name === "string") setName(draft.name);
      if (typeof draft.phone === "string") setPhone(draft.phone);
      if (draft.ageBand) setAgeBand(draft.ageBand);
    },
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/onboarding/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, ageBand }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile");
        return;
      }
      clearDraft();
      await refreshSession();
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
      <Field label="Usual patient age group">
        <select
          value={ageBand}
          onChange={(e) =>
            setAgeBand(e.target.value as (typeof AGE_BANDS)[number]["id"])
          }
          className="field"
        >
          {AGE_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-xs text-ink/50">
        We only collect what is needed for matching. Care details are added per
        request — not stored as a full medical record.
      </p>
      {error ? <FormErrorAlert message={error} /> : null}
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
