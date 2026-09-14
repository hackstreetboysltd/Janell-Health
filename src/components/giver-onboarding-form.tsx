"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState, useTransition } from "react";
import { FormErrorAlert } from "@/components/form-error-alert";
import { HealthStationPicker } from "@/components/health-station-picker";
import { ModuleHeading } from "@/components/module-heading";
import {
  ProviderDocumentsPicker,
  uploadProviderDocuments,
  type PendingProviderDoc,
} from "@/components/provider-documents-picker";
import type { PlaceSelection } from "@/components/places-location-input";
import { useFormDraft } from "@/hooks/use-form-draft";
import { FORM_DRAFT_KEYS } from "@/lib/form-draft";
import { MIN_DOCUMENTS_FOR_REVIEW } from "@/lib/provider-documents";
import { ServicesPicker } from "@/components/services-picker";
import {
  defaultServicesForProfession,
  type ServiceGroupId,
} from "@/lib/services";

const PROFESSIONS = [
  { id: "NURSE", label: "Nurse", idLabel: "Nursing council ID" },
  {
    id: "CAREGIVER",
    label: "Caregiver",
    idLabel: "Caregiver ID / certificate no.",
  },
] as const;

const STEPS = [
  {
    id: "identity",
    title: "About you",
    hint: "How patients and our team reach you.",
  },
  {
    id: "credentials",
    title: "Credentials",
    hint: "Your profession and registration details.",
  },
  {
    id: "services",
    title: "What you offer",
    hint: "Tell patients what care you provide.",
  },
  {
    id: "documents",
    title: "Verification",
    hint: "Upload ID and license for review.",
  },
  {
    id: "location",
    title: "Your station",
    hint: "Where you operate from in Nairobi.",
  },
  {
    id: "schedule",
    title: "Hours & rate",
    hint: "When you're available and your fee.",
  },
] as const;

export function GiverOnboardingForm({
  defaultName,
  defaultPhone,
  className = "",
}: {
  defaultName: string;
  defaultPhone: string;
  className?: string;
}) {
  const router = useRouter();
  const { update: refreshSession } = useSession();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [nationalId, setNationalId] = useState("");
  const [profession, setProfession] =
    useState<(typeof PROFESSIONS)[number]["id"]>("NURSE");
  const [professionId, setProfessionId] = useState("");
  const [yearsExperience, setYearsExperience] = useState("1");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [rateType, setRateType] = useState<"HOURLY" | "VISIT">("VISIT");
  const [rateKes, setRateKes] = useState("2500");
  const [wdStart, setWdStart] = useState("08:00");
  const [wdEnd, setWdEnd] = useState("17:00");
  const [weStart, setWeStart] = useState("09:00");
  const [weEnd, setWeEnd] = useState("14:00");
  const [documents, setDocuments] = useState<PendingProviderDoc[]>([]);
  const [savedCaregiverId, setSavedCaregiverId] = useState<string | null>(null);
  const [servicesOffered, setServicesOffered] = useState<string[]>(
    defaultServicesForProfession("NURSE"),
  );

  const draftSnapshot = useMemo(
    () => ({
      fullName,
      phone,
      nationalId,
      profession,
      professionId,
      yearsExperience,
      bio,
      address,
      placeId,
      lat,
      lng,
      rateType,
      rateKes,
      wdStart,
      wdEnd,
      weStart,
      weEnd,
      servicesOffered,
      step,
    }),
    [
      fullName,
      phone,
      nationalId,
      profession,
      professionId,
      yearsExperience,
      bio,
      address,
      placeId,
      lat,
      lng,
      rateType,
      rateKes,
      wdStart,
      wdEnd,
      weStart,
      weEnd,
      servicesOffered,
      step,
    ],
  );

  const { clearDraft } = useFormDraft(
    FORM_DRAFT_KEYS.giverOnboarding,
    draftSnapshot,
    (draft) => {
      if (typeof draft.fullName === "string") setFullName(draft.fullName);
      if (typeof draft.phone === "string") setPhone(draft.phone);
      if (typeof draft.nationalId === "string") setNationalId(draft.nationalId);
      if (draft.profession) setProfession(draft.profession);
      if (typeof draft.professionId === "string") setProfessionId(draft.professionId);
      if (typeof draft.yearsExperience === "string") {
        setYearsExperience(draft.yearsExperience);
      }
      if (typeof draft.bio === "string") setBio(draft.bio);
      if (typeof draft.address === "string") setAddress(draft.address);
      if (typeof draft.placeId === "string") setPlaceId(draft.placeId);
      if (typeof draft.lat === "number") setLat(draft.lat);
      if (typeof draft.lng === "number") setLng(draft.lng);
      if (draft.rateType) setRateType(draft.rateType);
      if (typeof draft.rateKes === "string") setRateKes(draft.rateKes);
      if (typeof draft.wdStart === "string") setWdStart(draft.wdStart);
      if (typeof draft.wdEnd === "string") setWdEnd(draft.wdEnd);
      if (typeof draft.weStart === "string") setWeStart(draft.weStart);
      if (typeof draft.weEnd === "string") setWeEnd(draft.weEnd);
      if (Array.isArray(draft.servicesOffered)) {
        setServicesOffered(draft.servicesOffered);
      }
      if (typeof draft.step === "number" && draft.step >= 0 && draft.step < STEPS.length) {
        setStep(draft.step);
      }
    },
  );

  const serviceGroup: ServiceGroupId =
    profession === "NURSE" ? "nursing" : "caregiving";

  const idLabel =
    PROFESSIONS.find((p) => p.id === profession)?.idLabel || "Profession ID";

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  function onPlace(place: PlaceSelection) {
    setAddress(place.address);
    setPlaceId(place.placeId);
    setLat(place.lat);
    setLng(place.lng);
  }

  function validateStep(index: number): string | null {
    switch (STEPS[index].id) {
      case "identity":
        if (!fullName.trim()) return "Enter your full name.";
        if (!phone.trim()) return "Enter your phone number.";
        if (!nationalId.trim()) return "Enter your national ID number.";
        return null;
      case "credentials":
        if (!professionId.trim()) return `Enter your ${idLabel.toLowerCase()}.`;
        if (!yearsExperience || Number(yearsExperience) < 0) {
          return "Enter years of experience.";
        }
        return null;
      case "services":
        if (servicesOffered.length === 0) return "Select at least one service.";
        return null;
      case "documents":
        if (documents.length < MIN_DOCUMENTS_FOR_REVIEW) {
          return `Upload at least ${MIN_DOCUMENTS_FOR_REVIEW} verification documents.`;
        }
        if (!documents.some((d) => d.documentType === "NATIONAL_ID")) {
          return "Include a national ID document.";
        }
        if (!documents.some((d) => d.documentType === "PROFESSION_LICENSE")) {
          return "Include a professional license document.";
        }
        return null;
      case "location":
        if (lat == null || lng == null || !placeId || !address.trim()) {
          return "Pick your health station on the map.";
        }
        return null;
      case "schedule":
        if (!rateKes || Number(rateKes) < 100) return "Enter a valid rate in KES.";
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

    startTransition(async () => {
      let caregiverId = savedCaregiverId;
      if (!caregiverId) {
        const res = await fetch("/api/onboarding/giver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            phone,
            nationalId,
            profession,
            professionId,
            yearsExperience: Number(yearsExperience),
            bio,
            address: address.trim(),
            placeId,
            lat,
            lng,
            rateType,
            rateKes: Number(rateKes),
            availableWeekdaysStart: wdStart,
            availableWeekdaysEnd: wdEnd,
            availableWeekendsStart: weStart,
            availableWeekendsEnd: weEnd,
            specializations: servicesOffered,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not save profile");
          return;
        }
        caregiverId = data.caregiverId as string;
        setSavedCaregiverId(caregiverId);
      }

      try {
        await uploadProviderDocuments(caregiverId, documents);
        const reviewRes = await fetch(
          `/api/providers/${caregiverId}/submit-review`,
          { method: "POST" },
        );
        const reviewData = await reviewRes.json();
        if (!reviewRes.ok) {
          setError(reviewData.error || "Documents uploaded but review submit failed");
          return;
        }
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Could not upload documents",
        );
        return;
      }

      clearDraft();
      await refreshSession();
      router.push("/giver");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className={`flex min-h-0 flex-col ${className}`}
      aria-labelledby="giver-onboarding-title"
    >
      <div className="shrink-0">
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Onboarding progress, step ${step + 1} of ${STEPS.length}`}
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
          id="giver-onboarding-title"
          wrapperClassName="mt-3"
          className="font-display text-2xl leading-tight"
          backHref="/"
        >
          {current.title}
        </ModuleHeading>
        <p className="mt-1 text-sm text-ink/55">{current.hint}</p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2 pt-0.5">
        <div className="flex flex-col gap-3">
          {current.id === "identity" ? (
            <>
              <Field label="Full name">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="giver-field"
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone">
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="giver-field"
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
              <Field label="National ID">
                <input
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="giver-field"
                />
              </Field>
            </>
          ) : null}

          {current.id === "credentials" ? (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-ink/80">Profession</legend>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProfession(p.id);
                        setServicesOffered(defaultServicesForProfession(p.id));
                      }}
                      className={`min-h-10 rounded-lg border text-sm font-medium ${
                        profession === p.id
                          ? "border-sage bg-sage text-white"
                          : "border-mist bg-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field label={idLabel}>
                <input
                  required
                  value={professionId}
                  onChange={(e) => setProfessionId(e.target.value)}
                  className="giver-field font-mono text-sm"
                />
              </Field>
              <Field label="Years of experience">
                <input
                  required
                  type="number"
                  min={0}
                  max={60}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="giver-field"
                />
              </Field>
            </>
          ) : null}

          {current.id === "services" ? (
            <div className="flex flex-col gap-4">
              <Field label="Short bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="giver-field resize-none"
                  placeholder="Specializations, critical care, languages…"
                />
              </Field>
              <div>
                <p className="text-sm font-medium text-ink/80">Services</p>
                <div className="mt-2 w-full rounded-xl border border-mist bg-white px-3.5 py-3">
                  <ServicesPicker
                    professionGroup={serviceGroup}
                    selected={servicesOffered}
                    onChange={setServicesOffered}
                    disabled={pending}
                    hideGroupLabels
                    showSelectionCount={false}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-ink/50">
                  {servicesOffered.length > 0
                    ? `${servicesOffered.length} selected`
                    : "Select at least one service you offer."}
                </p>
              </div>
            </div>
          ) : null}

          {current.id === "documents" ? (
            <ProviderDocumentsPicker
              documents={documents}
              onChange={setDocuments}
              disabled={pending}
            />
          ) : null}

          {current.id === "location" ? (
            <Field label="Health station">
              <HealthStationPicker
                lat={lat}
                lng={lng}
                address={address}
                onSelect={onPlace}
              />
            </Field>
          ) : null}

          {current.id === "schedule" ? (
            <>
              <fieldset className="rounded-lg border border-mist bg-white p-2.5">
                <legend className="px-1 text-sm font-medium text-ink/80">
                  Availability
                </legend>
                <ScheduleRow
                  label="Weekdays"
                  start={wdStart}
                  end={wdEnd}
                  onStart={setWdStart}
                  onEnd={setWdEnd}
                />
                <ScheduleRow
                  label="Weekends"
                  start={weStart}
                  end={weEnd}
                  onStart={setWeStart}
                  onEnd={setWeEnd}
                  className="mt-2"
                />
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-ink/80">Rate</legend>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRateType("VISIT")}
                    className={`min-h-10 flex-1 rounded-lg border text-sm ${
                      rateType === "VISIT"
                        ? "border-sage bg-sage text-white"
                        : "border-mist bg-white"
                    }`}
                  >
                    Per visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateType("HOURLY")}
                    className={`min-h-10 flex-1 rounded-lg border text-sm ${
                      rateType === "HOURLY"
                        ? "border-sage bg-sage text-white"
                        : "border-mist bg-white"
                    }`}
                  >
                    Hourly
                  </button>
                </div>
                <input
                  required
                  type="number"
                  min={100}
                  value={rateKes}
                  onChange={(e) => setRateKes(e.target.value)}
                  className="giver-field mt-2 font-mono"
                  placeholder="KES"
                />
              </fieldset>
            </>
          ) : null}

          {error ? <FormErrorAlert message={error} /> : null}
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
                ? "Submitting…"
                : savedCaregiverId
                  ? "Retry upload"
                  : "Submit for verification"}
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
        .giver-field {
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
        .giver-field:focus,
        .giver-field:focus-visible {
          outline: none;
          border-color: var(--sage);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sage) 55%, transparent);
        }
        .pac-container {
          z-index: 10050 !important;
          border-radius: 0.5rem;
          border: 1px solid var(--mist);
          box-shadow: 0 8px 24px rgba(20, 32, 26, 0.12);
          font-family: inherit;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink/80">
      {label}
      {children}
    </label>
  );
}

function ScheduleRow({
  label,
  start,
  end,
  onStart,
  onEnd,
  className = "",
}: {
  label: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-medium text-ink/45">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          value={start}
          onChange={(e) => onStart(e.target.value)}
          className="giver-field !mt-0"
          required
          aria-label={`${label} start`}
        />
        <input
          type="time"
          value={end}
          onChange={(e) => onEnd(e.target.value)}
          className="giver-field !mt-0"
          required
          aria-label={`${label} end`}
        />
      </div>
    </div>
  );
}
