"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NAIROBI_CENTER } from "@/lib/regions";
import { formatKes } from "@/lib/commission";
import { caregiverMapMarkerIcon } from "@/lib/caregiver-map-marker";
import Link from "next/link";

export type MapCaregiver = {
  id: string;
  fullName: string;
  phone: string;
  profession: string;
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
            c.phone,
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
        <Link
          href="/patient"
          className="absolute left-3 top-20 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-sm font-medium shadow-sm lg:top-3"
        >
          ← Cases
        </Link>
      </div>

      <aside className="z-10 -mt-4 flex max-h-[55vh] flex-col rounded-t-2xl border border-mist bg-white shadow-[0_-8px_24px_rgba(20,32,26,0.08)] lg:mt-0 lg:max-h-none lg:w-[360px] lg:rounded-none lg:border-l lg:shadow-none">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-mist lg:hidden" />
        <div className="border-b border-mist px-4 py-3">
          <h1 className="font-display text-xl">Nearest givers</h1>
          <p className="text-sm text-ink/55">
            Exact locations — sorted by distance
          </p>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {caregivers.length === 0 ? (
            <li className="px-4 py-8 text-center text-ink/50">
              No active givers yet. Ask a nurse to join Carelink KE.
            </li>
          ) : (
            caregivers.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full flex-col gap-0.5 border-b border-mist px-4 py-3 text-left ${
                    selectedId === c.id ? "bg-sage/5" : "bg-white"
                  }`}
                >
                  <span className="font-semibold">{c.fullName}</span>
                  <span className="font-mono text-xs text-ink/55">{c.phone || "—"}</span>
                  <span className="text-sm text-ink/60">
                    {c.profession} · {c.address} · {c.distanceKm.toFixed(1)} km
                  </span>
                  <span className="font-mono text-sm text-sage">
                    {formatKes(c.rateKes)} / {c.rateType === "HOURLY" ? "hr" : "visit"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        {selected ? (
          <div className="safe-pb border-t border-mist px-4 py-3">
            <p className="text-xs text-ink/50">
              Weekdays {selected.availableWeekdaysStart}–{selected.availableWeekdaysEnd} ·
              Weekends {selected.availableWeekendsStart}–{selected.availableWeekendsEnd}
            </p>
            <Link
              href={
                caseId
                  ? `/patient/book/${selected.id}?caseId=${caseId}`
                  : `/patient/book/${selected.id}`
              }
              className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-sage font-semibold text-white"
            >
              Book {selected.fullName.split(" ")[0]}
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
