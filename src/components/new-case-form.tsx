"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  CaseAttachmentsPicker,
  uploadCaseAttachments,
} from "@/components/case-attachments-picker";
import { CategoryServicesPicker } from "@/components/category-services-picker";
import { FormErrorAlert } from "@/components/form-error-alert";
import { ModuleHeading } from "@/components/module-heading";
import { PlacesLocationInput } from "@/components/places-location-input";
import type { PlaceSelection } from "@/components/places-location-input";
import {
  AGE_BANDS,
  CARE_CATEGORIES,
  DURATION_OPTIONS,
  GENDER_PREFERENCES,
} from "@/lib/care-categories";
import { FORM_DRAFT_KEYS } from "@/lib/form-draft";
import { useFormDraft } from "@/hooks/use-form-draft";

import type { CareCategory, AgeBand, GenderPreference } from "@prisma/client";

export type NewCaseInitial = {
  category?: CareCategory;
  ageBand?: AgeBand;
  careSummary?: string;
  visitAddress?: string;
  visitPlaceId?: string;
  visitLat?: number;
  visitLng?: number;
  durationMinutes?: number;
  genderPreference?: GenderPreference;
  specialRequirements?: string;
  repeatCaregiverName?: string;
};

const STEPS = [
  {
    id: "care-type",
    title: "What care?",
    hint: "Choose the type of support you need.",
  },
  {
    id: "patient",
    title: "About the patient",
    hint: "Age group and a short summary for professionals.",
  },
  {
    id: "services",
    title: "Specific needs",
    hint: "Optional — tap any that apply.",
  },
  {
    id: "location",
    title: "Visit location",
    hint: "Where care should take place.",
  },
  {
    id: "schedule",
    title: "When",
    hint: "Preferred date, time, and visit length.",
  },
  {
    id: "finish",
    title: "Anything else?",
    hint: "Preferences, notes, and photos if helpful.",
  },
] as const;

export function NewCaseForm({
  initial,
  className = "",
}: {
  initial?: NewCaseInitial;
  className?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);

  const [category, setCategory] = useState<(typeof CARE_CATEGORIES)[number]["id"]>(
    initial?.category ?? "HOME_NURSING",
  );
  const [ageBand, setAgeBand] = useState<(typeof AGE_BANDS)[number]["id"]>(
    initial?.ageBand ?? "ADULT",
  );
  const [careSummary, setCareSummary] = useState(initial?.careSummary ?? "");
  const [visitAddress, setVisitAddress] = useState(initial?.visitAddress ?? "");
  const [visitPlaceId, setVisitPlaceId] = useState(initial?.visitPlaceId ?? "");
  const [visitLat, setVisitLat] = useState<number | null>(
    initial?.visitLat ?? null,
  );
  const [visitLng, setVisitLng] = useState<number | null>(
    initial?.visitLng ?? null,
  );
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.durationMinutes ?? 240,
  );
  const [genderPreference, setGenderPreference] = useState<
    (typeof GENDER_PREFERENCES)[number]["id"]
  >(initial?.genderPreference ?? "NO_PREFERENCE");
  const [specialRequirements, setSpecialRequirements] = useState(
    initial?.specialRequirements ?? "",
  );
  const [files, setFiles] = useState<File[]>([]);
  const [services, setServices] = useState<string[]>([]);

  const draftSnapshot = useMemo(
    () => ({
      category,
      ageBand,
      careSummary,
      visitAddress,
      visitPlaceId,
      visitLat,
      visitLng,
      visitDate,
      visitTime,
      durationMinutes,
      genderPreference,
      specialRequirements,
      services,
      step,
    }),
    [
      category,
      ageBand,
      careSummary,
      visitAddress,
      visitPlaceId,
      visitLat,
      visitLng,
      visitDate,
      visitTime,
      durationMinutes,
      genderPreference,
      specialRequirements,
      services,
      step,
    ],
  );

  const { clearDraft } = useFormDraft(
    FORM_DRAFT_KEYS.newCase,
    draftSnapshot,
    (draft) => {
      if (draft.category) setCategory(draft.category);
      if (draft.ageBand) setAgeBand(draft.ageBand);
      if (typeof draft.careSummary === "string") setCareSummary(draft.careSummary);
      if (typeof draft.visitAddress === "string") setVisitAddress(draft.visitAddress);
      if (typeof draft.visitPlaceId === "string") setVisitPlaceId(draft.visitPlaceId);
      if (typeof draft.visitLat === "number") setVisitLat(draft.visitLat);
      if (typeof draft.visitLng === "number") setVisitLng(draft.visitLng);
      if (typeof draft.visitDate === "string") setVisitDate(draft.visitDate);
      if (typeof draft.visitTime === "string") setVisitTime(draft.visitTime);
      if (typeof draft.durationMinutes === "number") {
        setDurationMinutes(draft.durationMinutes);
      }
      if (draft.genderPreference) setGenderPreference(draft.genderPreference);
      if (typeof draft.specialRequirements === "string") {
        setSpecialRequirements(draft.specialRequirements);
      }
      if (Array.isArray(draft.services)) setServices(draft.services);
      if (typeof draft.step === "number" && draft.step >= 0 && draft.step < STEPS.length) {
        setStep(draft.step);
      }
    },
    { enabled: !initial?.repeatCaregiverName },
  );

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const minDate = new Date().toISOString().slice(0, 10);

  function onVisitPlace(place: PlaceSelection) {
    setVisitAddress(place.address);
    setVisitPlaceId(place.placeId);
    setVisitLat(place.lat);
    setVisitLng(place.lng);
  }

  function validateStep(index: number): string | null {
    switch (STEPS[index].id) {
      case "care-type":
        return category ? null : "Choose a care type.";
      case "patient":
        if (careSummary.trim().length < 10) {
          return "Describe the care needed in a few sentences.";
        }
        return null;
      case "services":
        return null;
      case "location":
        if (visitLat == null || visitLng == null || !visitPlaceId || !visitAddress.trim()) {
          return "Pick where care is needed on the map.";
        }
        return null;
      case "schedule": {
        if (!visitDate) return "Choose a visit date.";
        const scheduledAt = new Date(`${visitDate}T${visitTime}:00`);
        if (Number.isNaN(scheduledAt.getTime())) return "Invalid date or time.";
        if (scheduledAt.getTime() < Date.now()) return "Visit must be in the future.";
        return null;
      }
      case "finish":
        return null;
      default:
        return null;
    }
  }

  function goNext() {
    const stepError = validateStep(step);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (let i = 0; i < STEPS.length; i++) {
      const stepError = validateStep(i);
      if (stepError) {
        setStep(i);
        setError(stepError);
        return;
      }
    }

    const scheduledAt = new Date(`${visitDate}T${visitTime}:00`);

    startTransition(async () => {
      let caseId = savedCaseId;
      if (!caseId) {
        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            ageBand,
            careSummary: careSummary.trim(),
            visitAddress: visitAddress.trim(),
            visitPlaceId,
            visitLat,
            visitLng,
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes,
            genderPreference,
            specialRequirements: specialRequirements.trim(),
            services,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not create request");
          return;
        }
        caseId = data.id as string;
        setSavedCaseId(caseId);
        clearDraft();
      }

      if (files.length > 0) {
        try {
          await uploadCaseAttachments(caseId, files);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Some files failed to upload",
          );
          return;
        }
      }

      router.push(`/patient/find?caseId=${caseId}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className={`flex min-h-0 flex-col ${className}`}
      aria-labelledby="new-case-title"
    >
      <div className="shrink-0">
        {initial?.repeatCaregiverName ? (
          <p className="mb-3 rounded-xl bg-sage/10 px-3.5 py-2.5 text-sm text-ink/75">
            Booking again with <strong>{initial.repeatCaregiverName}</strong> —
            update the date and time if needed.
          </p>
        ) : null}
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Request progress, step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-sage" : "bg-mist"
              }`}
              aria-hidden
            />
          ))}
        </div>
        <ModuleHeading
          id="new-case-title"
          wrapperClassName="mt-3"
          className="font-display text-2xl leading-tight"
          backHref="/patient"
        >
          {current.title}
        </ModuleHeading>
        <p className="mt-1 text-sm text-ink/55">{current.hint}</p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2 pt-0.5">
        <div className="flex flex-col gap-3">
          {current.id === "care-type" ? (
            <div className="grid grid-cols-2 gap-2">
              {CARE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setServices([]);
                  }}
                  className={`min-h-10 rounded-lg border px-2 text-sm font-medium ${
                    category === c.id
                      ? "border-sage bg-sage text-white"
                      : "border-mist bg-white text-ink/80"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}

          {current.id === "patient" ? (
            <>
              <Field label="Patient age group">
                <select
                  value={ageBand}
                  onChange={(e) =>
                    setAgeBand(e.target.value as (typeof AGE_BANDS)[number]["id"])
                  }
                  className="case-field"
                >
                  {AGE_BANDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Care needed (brief summary)">
                <textarea
                  required
                  value={careSummary}
                  onChange={(e) => setCareSummary(e.target.value)}
                  rows={4}
                  className="case-field resize-none"
                  placeholder="e.g. Help with mobility and feeding after hospital discharge."
                />
              </Field>
            </>
          ) : null}

          {current.id === "services" ? (
            <div>
              <div className="rounded-xl border border-mist bg-white px-3.5 py-3">
                <CategoryServicesPicker
                  category={category}
                  selected={services}
                  onChange={setServices}
                  disabled={pending}
                  compact
                />
              </div>
              <p className="mt-2 text-center text-xs text-ink/50">
                {services.length > 0
                  ? `${services.length} selected`
                  : "Skip if you're not sure — you can describe more in the summary."}
              </p>
            </div>
          ) : null}

          {current.id === "location" ? (
            <Field label="Visit location">
              <PlacesLocationInput
                value={visitAddress}
                onChangeText={setVisitAddress}
                onSelect={onVisitPlace}
                hasCoordinates={visitLat != null && visitLng != null}
                placeholder="Search patient home address…"
              />
            </Field>
          ) : null}

          {current.id === "schedule" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preferred date">
                  <input
                    type="date"
                    required
                    min={minDate}
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="case-field"
                  />
                </Field>
                <Field label="Preferred time">
                  <input
                    type="time"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="case-field"
                  />
                </Field>
              </div>
              <Field label="Duration">
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="case-field"
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.minutes} value={d.minutes}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}

          {current.id === "finish" ? (
            <>
              <Field label="Gender preference (optional)">
                <select
                  value={genderPreference}
                  onChange={(e) =>
                    setGenderPreference(
                      e.target.value as (typeof GENDER_PREFERENCES)[number]["id"],
                    )
                  }
                  className="case-field"
                >
                  {GENDER_PREFERENCES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Special requirements (optional)">
                <textarea
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  rows={2}
                  className="case-field resize-none"
                  placeholder="Access instructions, equipment at home, etc."
                />
              </Field>
              <CaseAttachmentsPicker
                files={files}
                onChange={setFiles}
                disabled={pending}
              />
            </>
          ) : null}

          {error ? <FormErrorAlert message={error} /> : null}
          {savedCaseId && error ? (
            <button
              type="button"
              onClick={() => router.push(`/patient/find?caseId=${savedCaseId}`)}
              className="min-h-11 text-sm font-medium text-sage underline-offset-2 hover:underline"
            >
              Continue without attachments
            </button>
          ) : null}
        </div>
      </div>

      <div className="safe-pb shrink-0 border-t border-mist/80 bg-canvas/95 py-3 backdrop-blur">
        <div className="flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              className="min-h-11 flex-1 rounded-xl border border-mist bg-white text-sm font-semibold text-ink/75 disabled:opacity-60"
            >
              Back
            </button>
          ) : null}
          {isLastStep ? (
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 flex-1 rounded-xl bg-sage text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? "Saving…"
                : savedCaseId
                  ? "Retry file upload"
                  : "Find verified professionals"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={pending}
              className={`min-h-11 rounded-xl bg-sage text-sm font-semibold text-white disabled:opacity-60 ${
                step > 0 ? "flex-1" : "w-full"
              }`}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .case-field {
          margin-top: 0.25rem;
          min-height: 2.75rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--mist);
          background: var(--white);
          padding: 0.625rem 0.75rem;
          font-size: 0.9375rem;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }
        .case-field:focus,
        .case-field:focus-visible {
          outline: none;
          border-color: var(--sage);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sage) 55%, transparent);
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
