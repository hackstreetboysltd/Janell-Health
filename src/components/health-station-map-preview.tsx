"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinGlyph } from "@/components/map-pin-glyph";

function MapReady() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

type Props = {
  lat: number;
  lng: number;
  selected?: boolean;
};

export function HealthStationMapPreview({ lat, lng, selected }: Props) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-xl bg-mist/40">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        className="absolute inset-0 z-0 h-full w-full"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapReady />
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
        <div className="-mt-5 flex flex-col items-center">
          <MapPinGlyph large />
          <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-ink/35" />
        </div>
      </div>

      {!selected ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-[#14201a]/55 to-transparent px-3 pb-3 pt-8">
          <p className="text-center text-xs font-medium text-white/90">
            Tap to pick your health station
          </p>
        </div>
      ) : null}
    </div>
  );
}
