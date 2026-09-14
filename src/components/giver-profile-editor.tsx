"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  PlacesLocationInput,
  type PlaceSelection,
} from "@/components/places-location-input";
import { formatKes } from "@/lib/commission";
import { caregiverLocationLabel } from "@/lib/regions";
import { ServicesPicker } from "@/components/services-picker";
import type { ServiceGroupId } from "@/lib/services";

const PROFESSIONS = [
  { id: "CAREGIVER", label: "Caregiver" },
  { id: "NURSE", label: "Nurse" },
] as const;

type Profession = (typeof PROFESSIONS)[number]["id"];
type RateType = "HOURLY" | "VISIT";

type ProfileValues = {
  fullName: string;
  phone: string;
  nationalId: string;
  profession: Profession;
  professionId: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  regionName: string;
  rateType: RateType;
  rateKes: number;
  availableWeekdaysStart: string;
  availableWeekdaysEnd: string;
  availableWeekendsStart: string;
  availableWeekendsEnd: string;
  specializations: string[];
};

export function GiverProfileEditor({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ProfileValues>(initial);
  const profile = editing ? values : initial;

  const locationLabel = caregiverLocationLabel(profile.address, profile.regionName);
  const serviceGroup: ServiceGroupId =
    profile.profession === "NURSE" ? "nursing" : "caregiving";

  function set<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onPlace(place: PlaceSelection) {
    setValues((prev) => ({
      ...prev,
      address: place.address,
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
    }));
  }

  function onAddressText(text: string) {
    setValues((prev) => ({
      ...prev,
      address: text,
      placeId: "",
    }));
  }

  function cancel() {
    setValues(initial);
    setError(null);
    setEditing(false);
  }

  function save() {
    setError(null);
    if (!values.placeId || !values.address.trim()) {
      setError("Select your exact location from the address dropdown.");
      return;
    }
    if (values.specializations.length === 0) {
      setError("Select at least one service you offer.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/onboarding/giver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          phone: values.phone,
          nationalId: values.nationalId,
          profession: values.profession,
          professionId: values.professionId,
          address: values.address.trim(),
          placeId: values.placeId,
          lat: values.lat,
          lng: values.lng,
          rateType: values.rateType,
          rateKes: Number(values.rateKes),
          availableWeekdaysStart: values.availableWeekdaysStart,
          availableWeekdaysEnd: values.availableWeekdaysEnd,
          availableWeekendsStart: values.availableWeekendsStart,
          availableWeekendsEnd: values.availableWeekendsEnd,
          specializations: values.specializations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <dl className="mt-6 space-y-3 rounded-xl border border-mist bg-white p-4 text-sm">
        <div>
          <dt className="text-ink/45">Name</dt>
          <dd className="font-medium">
            {editing ? (
              <input
                value={values.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                className="edit-field"
              />
            ) : (
              profile.fullName
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Profession</dt>
          <dd>
            {editing ? (
              <div className="mt-1 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        set("profession", p.id);
                        if (values.specializations.length === 0) {
                          set("specializations", []);
                        }
                      }}
                      className={`min-h-10 rounded-lg border text-xs font-medium ${
                        values.profession === p.id
                          ? "border-sage bg-sage text-white"
                          : "border-mist bg-canvas text-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  value={values.professionId}
                  onChange={(e) => set("professionId", e.target.value)}
                  className="edit-field font-mono"
                  placeholder="Profession ID"
                />
              </div>
            ) : (
              <>
                {profile.profession} ·{" "}
                <span className="font-mono">{profile.professionId}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Location</dt>
          <dd>
            {editing ? (
              <PlacesLocationInput
                value={values.address}
                onChangeText={onAddressText}
                onSelect={onPlace}
                required
                className="edit-field"
                hasCoordinates={Boolean(values.placeId && values.lat && values.lng)}
              />
            ) : (
              locationLabel
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Services offered</dt>
          <dd className="mt-1">
            {editing ? (
              <ServicesPicker
                professionGroup={serviceGroup}
                selected={values.specializations}
                onChange={(ids) => set("specializations", ids)}
                disabled={pending}
              />
            ) : profile.specializations.length > 0 ? (
              <p className="text-sm text-ink/75">
                {profile.specializations.length} services listed
              </p>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Rate</dt>
          <dd className="font-mono">
            {editing ? (
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set("rateType", "VISIT")}
                    className={`min-h-10 flex-1 rounded-lg border text-xs ${
                      values.rateType === "VISIT"
                        ? "border-sage bg-sage text-white"
                        : "border-mist bg-canvas"
                    }`}
                  >
                    Per visit
                  </button>
                  <button
                    type="button"
                    onClick={() => set("rateType", "HOURLY")}
                    className={`min-h-10 flex-1 rounded-lg border text-xs ${
                      values.rateType === "HOURLY"
                        ? "border-sage bg-sage text-white"
                        : "border-mist bg-canvas"
                    }`}
                  >
                    Hourly
                  </button>
                </div>
                <input
                  type="number"
                  min={100}
                  value={values.rateKes}
                  onChange={(e) => set("rateKes", Number(e.target.value) || 0)}
                  className="edit-field font-mono"
                />
              </div>
            ) : (
              <>
                {formatKes(profile.rateKes)} /{" "}
                {profile.rateType === "HOURLY" ? "hour" : "visit"}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Weekdays</dt>
          <dd className="font-mono">
            {editing ? (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={values.availableWeekdaysStart}
                  onChange={(e) => set("availableWeekdaysStart", e.target.value)}
                  className="edit-field"
                />
                <input
                  type="time"
                  value={values.availableWeekdaysEnd}
                  onChange={(e) => set("availableWeekdaysEnd", e.target.value)}
                  className="edit-field"
                />
              </div>
            ) : (
              `${profile.availableWeekdaysStart} – ${profile.availableWeekdaysEnd}`
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink/45">Weekends</dt>
          <dd className="font-mono">
            {editing ? (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={values.availableWeekendsStart}
                  onChange={(e) => set("availableWeekendsStart", e.target.value)}
                  className="edit-field"
                />
                <input
                  type="time"
                  value={values.availableWeekendsEnd}
                  onChange={(e) => set("availableWeekendsEnd", e.target.value)}
                  className="edit-field"
                />
              </div>
            ) : (
              `${profile.availableWeekendsStart} – ${profile.availableWeekendsEnd}`
            )}
          </dd>
        </div>
      </dl>

      {error ? <p className="mt-3 text-sm text-alert">{error}</p> : null}

      {editing ? (
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-mist bg-white px-4 text-base font-semibold text-ink transition hover:bg-canvas disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setValues(initial);
            setError(null);
            setEditing(true);
          }}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90"
        >
          Edit profile
        </button>
      )}

      <style jsx global>{`
        .edit-field {
          margin-top: 0.25rem;
          min-height: 2.75rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--mist);
          background: var(--canvas);
          padding: 0.5rem 0.75rem;
          font: inherit;
          color: inherit;
        }
        .pac-container {
          z-index: 10050 !important;
          border-radius: 0.5rem;
          border: 1px solid var(--mist);
          box-shadow: 0 8px 24px rgba(20, 32, 26, 0.12);
          font-family: inherit;
        }
      `}</style>
    </>
  );
}
