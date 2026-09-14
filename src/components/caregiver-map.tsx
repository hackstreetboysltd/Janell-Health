"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NAIROBI_CENTER } from "@/lib/regions";
import { formatKes } from "@/lib/commission";
import { caregiverMapMarkerIcon } from "@/lib/caregiver-map-marker";
import { CaregiverBadgeRow } from "@/components/caregiver-badge-row";
import { EmptyState } from "@/components/empty-state";
import { ModuleHeading } from "@/components/module-heading";
import { StarRating } from "@/components/star-rating";
import Link from "next/link";
import type { VerificationStatus, MembershipTier } from "@prisma/client";

export type MapCaregiver = {
  id: string;
  fullName: string;
  profession: string;
  verificationStatus: VerificationStatus;
  membershipTier: MembershipTier;
  featured: boolean;
  yearsExperience: number;
  bio: string;
  ratingAverage: number;
  ratingCount: number;
  region: string;
  regionName: string;
  address: string;
  lat: number;
  lng: number;
  rateKes: number;
  rateType: string;
  distanceKm: number;
  availableWeekdaysStart: string;
  availableWeekdaysEnd: string;
  availableWeekendsStart: string;
  availableWeekendsEnd: string;
};

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView([NAIROBI_CENTER.lat, NAIROBI_CENTER.lng], 12);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.25));
  }, [map, points]);
  return null;
}

export function CaregiverMap({
  caregivers,
  caseId,
}: {
  caregivers: MapCaregiver[];
  caseId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    caregivers[0]?.id ?? null,
  );
  const selected = useMemo(
    () => caregivers.find((c) => c.id === selectedId) ?? null,
    [caregivers, selectedId],
  );

  const points = caregivers.map((c) => ({ lat: c.lat, lng: c.lng }));

  const markerIcons = useMemo(() => {
    const icons = new Map<string, L.DivIcon>();
    for (const c of caregivers) {
      icons.set(
        c.id,
        L.divIcon(
          caregiverMapMarkerIcon(
            c.fullName,
            `${c.profession} · ${c.yearsExperience}y`,
            c.id === selectedId,
          ),
        ),
      );
    }
    return icons;
  }, [caregivers, selectedId]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col pb-16 lg:flex-row">
      <div className="relative min-h-[45vh] flex-1 lg:min-h-0">
        <MapContainer
          center={[NAIROBI_CENTER.lat, NAIROBI_CENTER.lng]}
          zoom={12}
          className="absolute inset-0 z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {caregivers.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={markerIcons.get(c.id)}
              zIndexOffset={c.id === selectedId ? 1000 : 0}
              eventHandlers={{
                click: () => setSelectedId(c.id),
              }}
            />
          ))}
        </MapContainer>
      </div>

      <aside className="z-10 -mt-4 flex max-h-[55vh] flex-col rounded-t-2xl border border-mist bg-white shadow-[0_-8px_24px_rgba(20,32,26,0.08)] lg:mt-0 lg:max-h-none lg:w-[360px] lg:rounded-none lg:border-l lg:shadow-none">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-mist lg:hidden" />
        <div className="border-b border-mist px-4 py-3">
          <ModuleHeading
            wrapperClassName=""
            className="font-display text-xl tracking-tight"
            backHref="/patient"
          >
            Verified professionals
          </ModuleHeading>
          <p className="mt-1 trust-strip" aria-label="Trust and safety">
            <span>ID &amp; license checked</span>
            <span className="trust-strip-dot" aria-hidden />
            <span>M-Pesa after acceptance</span>
            <span className="trust-strip-dot" aria-hidden />
            <span>{caregivers.length} near you</span>
          </p>
        </div>
        <ul
          className="flex-1 overflow-y-auto"
          role="listbox"
          aria-label="Nearby verified professionals"
        >
          {caregivers.length === 0 ? (
            <li className="px-4 py-6">
              <EmptyState
                title="No matches for this visit yet"
                description="Try a different date, care category, or widen your visit area in the care request."
                action={{ href: "/patient/cases/new", label: "Edit care request" }}
              />
            </li>
          ) : (
            caregivers.map((c, index) => (
              <li key={c.id} className={index < 8 ? "stagger-fade" : undefined}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full flex-col gap-1 border-b border-mist px-4 py-3.5 text-left transition-colors ${
                    selectedId === c.id
                      ? "border-l-[3px] border-l-sage bg-sage/8"
                      : "border-l-[3px] border-l-transparent bg-white hover:bg-canvas/80"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{c.fullName}</span>
                    <CaregiverBadgeRow
                      verificationStatus={c.verificationStatus}
                      membershipTier={c.membershipTier}
                      featured={c.featured}
                      compact
                    />
                  </span>
                  <StarRating
                    average={c.ratingAverage}
                    count={c.ratingCount}
                    compact
                  />
                  <span className="text-sm text-ink/60">
                    {c.profession} · {c.yearsExperience} yrs · {c.distanceKm.toFixed(1)} km
                  </span>
                  <span className="text-xs text-ink/50">{c.address}</span>
                  <span className="font-mono text-sm text-sage">
                    {formatKes(c.rateKes)} / {c.rateType === "HOURLY" ? "hr" : "visit"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        {selected ? (
          <div className="safe-pb border-t border-mist bg-canvas/40 px-4 py-3">
            {selected.bio ? (
              <p className="line-clamp-2 text-xs leading-relaxed text-ink/55">{selected.bio}</p>
            ) : null}
            <p className="mt-2 text-xs text-ink/50">
              Weekdays {selected.availableWeekdaysStart}–{selected.availableWeekdaysEnd} ·
              Weekends {selected.availableWeekendsStart}–{selected.availableWeekendsEnd}
            </p>
            <Link
              href={
                caseId
                  ? `/patient/book/${selected.id}?caseId=${caseId}`
                  : `/patient/book/${selected.id}`
              }
              className="btn-primary mt-3 w-full"
            >
              Request {selected.fullName.split(" ")[0]}
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
