"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HealthStationPicker } from "@/components/health-station-picker";
import type { PlaceSelection } from "@/components/places-location-input";

const PROFESSIONS = [
  { id: "CAREGIVER", label: "Caregiver", idLabel: "Caregiver ID / certificate no." },
  { id: "NURSE", label: "Nurse", idLabel: "Nursing council ID" },
  { id: "DOCTOR", label: "Doctor", idLabel: "Medical board / KMPDC ID" },
] as const;

export function GiverOnboardingForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [nationalId, setNationalId] = useState("");
  const [profession, setProfession] =
    useState<(typeof PROFESSIONS)[number]["id"]>("NURSE");
  const [professionId, setProfessionId] = useState("");
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

  const idLabel =
    PROFESSIONS.find((p) => p.id === profession)?.idLabel || "Profession ID";

  function onPlace(place: PlaceSelection) {
    setAddress(place.address);
    setPlaceId(place.placeId);
    setLat(place.lat);
    setLng(place.lng);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (lat == null || lng == null || !placeId || !address.trim()) {
      setError("Pick your health station on the map.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/onboarding/giver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          nationalId,
          profession,
          professionId,
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile");
        return;
      }
      router.push("/giver");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Full name">
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="field" />
      </Field>
      <Field label="Phone">
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="07XXXXXXXX" inputMode="tel" />
      </Field>
      <Field label="National ID">
        <input required value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="field" />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink/80">Profession</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PROFESSIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfession(p.id)}
              className={`min-h-11 rounded-lg border text-sm font-medium ${
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
        <input required value={professionId} onChange={(e) => setProfessionId(e.target.value)} className="field font-mono text-sm" />
      </Field>
      <Field label="Your health station">
        <HealthStationPicker
          lat={lat}
          lng={lng}
          address={address}
          onSelect={onPlace}
        />
      </Field>
      <fieldset className="rounded-lg border border-mist bg-white p-3">
        <legend className="px-1 text-sm font-medium text-ink/80">Availability</legend>
        <p className="mb-2 text-xs text-ink/50">Weekdays</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="time" value={wdStart} onChange={(e) => setWdStart(e.target.value)} className="field" required />
          <input type="time" value={wdEnd} onChange={(e) => setWdEnd(e.target.value)} className="field" required />
        </div>
        <p className="mb-2 mt-3 text-xs text-ink/50">Weekends</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="time" value={weStart} onChange={(e) => setWeStart(e.target.value)} className="field" required />
          <input type="time" value={weEnd} onChange={(e) => setWeEnd(e.target.value)} className="field" required />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-ink/80">Rate</legend>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setRateType("VISIT")} className={`min-h-11 flex-1 rounded-lg border text-sm ${rateType === "VISIT" ? "border-sage bg-sage text-white" : "border-mist bg-white"}`}>Per visit</button>
          <button type="button" onClick={() => setRateType("HOURLY")} className={`min-h-11 flex-1 rounded-lg border text-sm ${rateType === "HOURLY" ? "border-sage bg-sage text-white" : "border-mist bg-white"}`}>Hourly</button>
        </div>
        <input required type="number" min={100} value={rateKes} onChange={(e) => setRateKes(e.target.value)} className="field mt-2 font-mono" placeholder="KES" />
      </fieldset>
      {error ? <p className="text-sm text-alert">{error}</p> : null}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist bg-canvas/95 px-5 py-3 backdrop-blur safe-pb md:static md:border-0 md:bg-transparent md:p-0">
        <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-sage font-semibold text-white disabled:opacity-60">
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
