"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinGlyph } from "@/components/map-pin-glyph";

type PlaceHit = {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  lat: number;
  lng: number;
  initialAddress?: string;
  heading?: string;
  onConfirm: (result: {
    lat: number;
    lng: number;
    address: string;
    placeId: string;
  }) => void;
  onClose: () => void;
};

function MapReady() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

function CenterTracker({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const map = useMapEvents({
    moveend() {
      const c = map.getCenter();
      onChangeRef.current(c.lat, c.lng);
    },
  });

  useEffect(() => {
    const c = map.getCenter();
    onChangeRef.current(c.lat, c.lng);
  }, [map]);

  return null;
}

function DragState({ onDragging }: { onDragging: (v: boolean) => void }) {
  useMapEvents({
    dragstart() {
      onDragging(true);
    },
    dragend() {
      onDragging(false);
    },
  });
  return null;
}

function FlyToTarget({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 17, { duration: 0.75 });
  }, [map, target?.lat, target?.lng]);
  return null;
}

export function LocationPinPickerModal({
  lat,
  lng,
  initialAddress = "",
  heading = "Pick location",
  onConfirm,
  onClose,
}: Props) {
  const listId = useId();
  const searchRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ lat, lng });
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState(initialAddress);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFetching, setSearchFetching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceHit | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let cancelled = false;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchFetching(true);
      try {
        const res = await fetch(`/api/geo/places?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setSearchError(data.error || "Could not search places");
          setSuggestions([]);
          return;
        }
        setSuggestions(
          (data.places || []).map(
            (p: { id: string; address: string; lat: number; lng: number }) => ({
              placeId: p.id,
              address: p.address,
              lat: p.lat,
              lng: p.lng,
            }),
          ),
        );
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError" && controller.signal.aborted) {
          return;
        }
        setSearchError("Could not search places");
        setSuggestions([]);
      } finally {
        if (!cancelled) setSearchFetching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmedQuery]);

  function pickSuggestion(place: PlaceHit) {
    setSelectedPlace(place);
    setQuery(place.address);
    setSearchOpen(false);
    setSuggestions([]);
    setFlyTarget({ lat: place.lat, lng: place.lng });
    setCoords({ lat: place.lat, lng: place.lng });
  }

  const showSuggestions = Boolean(
    searchOpen &&
      canSearch &&
      (searchFetching || suggestions.length > 0 || searchError),
  );

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center pt-[10px] sm:items-center sm:p-4 sm:pt-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pick location on map"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#14201a]/55 backdrop-blur-md"
        aria-label="Close map"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-[calc(100dvh-10px)] min-h-[28rem] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-mist bg-white shadow-[0_-12px_40px_rgba(20,32,26,0.25)] sm:h-[min(92dvh,44rem)] sm:min-h-[34rem] sm:rounded-2xl sm:shadow-[0_16px_48px_rgba(20,32,26,0.28)]">
        <div className="border-b border-mist px-4 py-[10px] text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
            {heading}
          </p>
        </div>

        <div className="relative min-h-[18rem] flex-1 w-full bg-mist/40 sm:min-h-[24rem]">
          <MapContainer
            center={[lat, lng]}
            zoom={17}
            className="absolute inset-0 z-0 h-full w-full"
            scrollWheelZoom
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapReady />
            <FlyToTarget target={flyTarget} />
            <CenterTracker onChange={(la, ln) => setCoords({ lat: la, lng: ln })} />
            <DragState onDragging={setDragging} />
          </MapContainer>

          <div
            ref={searchRef}
            className="absolute inset-x-0 top-3 z-[1100] flex justify-center px-4"
          >
            <div className="relative w-full max-w-sm">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  setSelectedPlace(null);
                  if (next.trim().length < 2) {
                    setSuggestions([]);
                    setSearchFetching(false);
                    setSearchError(null);
                    setSearchOpen(false);
                  } else {
                    setSearchOpen(true);
                  }
                }}
                onFocus={() => {
                  if (query.trim().length >= 2) setSearchOpen(true);
                }}
                placeholder="Search street, estate, or landmark…"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={Boolean(showSuggestions)}
                className="w-full rounded-full border border-mist bg-white/95 py-3 pl-4 pr-10 text-sm text-ink shadow-[0_8px_28px_rgba(20,32,26,0.18)] backdrop-blur-sm placeholder:text-ink/35 focus:border-sage/50 focus:outline-none focus:ring-2 focus:ring-sage/25"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery("");
                    setSelectedPlace(null);
                    setSuggestions([]);
                    setSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center text-red-500 transition hover:text-red-600"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}

              {showSuggestions ? (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-auto rounded-xl border border-mist bg-white py-1 shadow-[0_12px_32px_rgba(20,32,26,0.16)]"
                >
                  {searchFetching ? (
                    <li className="px-4 py-2.5 text-sm text-ink/45" aria-live="polite">
                      Searching…
                    </li>
                  ) : null}
                  {!searchFetching && suggestions.length === 0 ? (
                    <li className="px-4 py-2.5 text-sm text-ink/45">
                      {searchError || "No matching places — drag the map instead."}
                    </li>
                  ) : null}
                  {suggestions.map((place) => (
                    <li key={place.placeId} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-ink transition hover:bg-canvas"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(place)}
                      >
                        <MapPinGlyph className="mt-0.5 shrink-0" />
                        <span className="min-w-0">{place.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
            <div
              className={`-mt-6 flex flex-col items-center transition-transform duration-150 ${
                dragging ? "-translate-y-2 scale-110" : ""
              }`}
            >
              <MapPinGlyph large />
              <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-ink/35" />
            </div>
          </div>
        </div>

        <div className="safe-pb flex flex-col gap-2 border-t border-mist px-4 py-3">
          <p className="text-center font-mono text-[11px] text-ink/40">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </p>
          <button
            type="button"
            onClick={() => {
              const address = selectedPlace?.address || query.trim();
              const placeId = selectedPlace
                ? `${selectedPlace.placeId}:adj:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`
                : `map:manual:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
              onConfirm({
                lat: coords.lat,
                lng: coords.lng,
                address,
                placeId,
              });
            }}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90"
          >
            Confirm location
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-mist bg-white px-4 text-sm font-semibold text-ink transition hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
