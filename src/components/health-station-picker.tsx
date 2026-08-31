"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { NAIROBI_CENTER, nearestRegion } from "@/lib/regions";
import type { PlaceSelection } from "@/components/places-location-input";

const HealthStationMapPreview = dynamic(
  () =>
    import("@/components/health-station-map-preview").then(
      (m) => m.HealthStationMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-44 items-center justify-center rounded-xl border border-mist bg-mist/20 text-sm text-ink/45">
        Loading map…
      </div>
    ),
  },
);

const LocationPinPickerModal = dynamic(
  () =>
    import("@/components/location-pin-picker-modal").then(
      (m) => m.LocationPinPickerModal,
    ),
  { ssr: false },
);

type Props = {
  lat: number | null;
  lng: number | null;
  address: string;
  onSelect: (place: PlaceSelection) => void;
};

export function HealthStationPicker({ lat, lng, address, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const hasLocation = lat != null && lng != null;
  const previewLat = lat ?? NAIROBI_CENTER.lat;
  const previewLng = lng ?? NAIROBI_CENTER.lng;

  function handleConfirm(result: {
    lat: number;
    lng: number;
    address: string;
    placeId: string;
  }) {
    onSelect(result);
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-xl border border-mist bg-white text-left transition hover:border-sage/40 hover:shadow-[0_4px_20px_rgba(47,93,74,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        aria-label={
          hasLocation
            ? "Change your health station on the map"
            : "Pick your health station on the map"
        }
      >
        <HealthStationMapPreview
          lat={previewLat}
          lng={previewLng}
          selected={hasLocation}
        />
        {hasLocation ? (
          <div className="border-t border-mist px-3 py-2.5">
            <p className="line-clamp-2 text-sm font-medium text-ink">{address}</p>
            <p className="mt-0.5 text-xs text-sage group-hover:underline">
              Tap to adjust on map
            </p>
          </div>
        ) : null}
      </button>

      {!hasLocation ? (
        <p className="mt-1.5 text-xs text-ink/45">
          Set where patients find you — search an area, then drag the map to your
          exact spot.
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-sage">Health station set.</p>
      )}

      {open ? (
        <LocationPinPickerModal
          lat={previewLat}
          lng={previewLng}
          initialAddress={address}
          heading="Pick location"
          onClose={() => setOpen(false)}
          onConfirm={({ lat: la, lng: ln, address: addr, placeId }) => {
            const label =
              addr.trim() ||
              `${nearestRegion(la, ln).name}, Nairobi`;
            handleConfirm({
              lat: la,
              lng: ln,
              address: label,
              placeId:
                placeId ||
                `map:manual:${la.toFixed(5)},${ln.toFixed(5)}`,
            });
          }}
        />
      ) : null}
    </div>
  );
}
