"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";
import { MapPinGlyph } from "@/components/map-pin-glyph";
import { NAIROBI_CENTER, nearestRegion } from "@/lib/regions";

export type PlaceSelection = {
  address: string;
  placeId: string;
  lat: number;
  lng: number;
};

const LocationPinPickerModal = dynamic(
  () =>
    import("@/components/location-pin-picker-modal").then(
      (m) => m.LocationPinPickerModal,
    ),
  { ssr: false },
);

type Suggestion = PlaceSelection;

type Props = {
  value: string;
  onChangeText?: (text: string) => void;
  onSelect: (place: PlaceSelection) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  hasCoordinates?: boolean;
};

export function PlacesLocationInput({
  value,
  onChangeText,
  onSelect,
  required,
  className = "field",
  placeholder = "Search street, estate, or landmark…",
  hasCoordinates = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [locationPicked, setLocationPicked] = useState(false);
  const picked = hasCoordinates || locationPicked;
  const trimmedValue = value.trim();
  const canSearch = trimmedValue.length >= 2 && !picked;
  const [mapPlace, setMapPlace] = useState<
    (Suggestion & { mapMode?: "pick" | "adjust" }) | null
  >(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (mapPlace) return;
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [mapPlace]);

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let cancelled = false;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/geo/places?q=${encodeURIComponent(trimmedValue)}`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not search addresses");
          setSuggestions([]);
          return;
        }
        const places = (data.places || []).map(
          (p: { id: string; address: string; lat: number; lng: number }) => ({
            placeId: p.id,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
          }),
        ) as Suggestion[];
        setSuggestions(places);
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError" && controller.signal.aborted) {
          return;
        }
        setError("Could not search addresses");
        setSuggestions([]);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [canSearch, trimmedValue]);

  function commit(place: Suggestion) {
    setLocationPicked(true);
    setOpen(false);
    setSuggestions([]);
    setError(null);
    setMapPlace(null);
    onSelect(place);
  }

  function mapAddressLabel(text: string, lat: number, lng: number): string {
    const trimmed = text.trim();
    if (trimmed) return trimmed;
    const region = nearestRegion(lat, lng);
    return `${region.name}, Nairobi`;
  }

  function openMap(place: Suggestion) {
    setOpen(false);
    setMapPlace({ ...place, mapMode: "adjust" });
  }

  function openMapDirect() {
    setOpen(false);
    setError(null);
    setMapPlace({
      address: value.trim() || "Drag the map to your exact spot",
      placeId: "manual",
      lat: NAIROBI_CENTER.lat,
      lng: NAIROBI_CENTER.lng,
      mapMode: "pick",
    });
  }

  const showMenu = open && canSearch && !mapPlace;

  return (
    <div ref={wrapRef}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setLocationPicked(false);
              setError(null);
              const next = e.target.value;
              onChangeText?.(next);
              if (next.trim().length < 2) {
                setSuggestions([]);
                setFetching(false);
                setError(null);
                setOpen(false);
              } else {
                setOpen(true);
              }
            }}
            onFocus={() => {
              if (!picked && !mapPlace && value.trim().length >= 2) setOpen(true);
            }}
            className={className}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showMenu}
            required={required && !hasCoordinates && !picked}
          />

          {showMenu ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-mist bg-white py-1 shadow-[0_8px_24px_rgba(20,32,26,0.12)]"
            >
              {fetching ? (
                <li className="px-3 py-2.5 text-sm text-ink/45" aria-live="polite">
                  Searching places…
                </li>
              ) : null}
              {!fetching && suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink/45">
                  <p>{error || "No matching places"}</p>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center gap-2 rounded-lg border border-mist bg-canvas px-3 py-2 text-left text-sm font-medium text-sage transition hover:border-sage/30 hover:bg-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={openMapDirect}
                  >
                    <MapPinGlyph />
                    Pick on map instead
                  </button>
                </li>
              ) : null}
            {suggestions.map((place) => (
              <li key={place.placeId} role="option" aria-selected={false}>
                <div className="flex items-stretch gap-0.5">
                  <button
                    type="button"
                    title="Adjust pin on map"
                    aria-label={`Open map for ${place.address}`}
                    className="flex shrink-0 items-center justify-center px-2.5 text-sage transition hover:bg-canvas"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openMap(place)}
                  >
                    <MapPinGlyph />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-2 py-2.5 pr-3 text-left text-sm text-ink transition hover:bg-canvas"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openMap(place)}
                  >
                    {place.address}
                  </button>
                </div>
              </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={openMapDirect}
          className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-mist bg-white px-3 py-3 text-sm font-medium text-sage transition hover:border-sage/30 hover:bg-canvas"
          aria-label="Pick location on map"
        >
          <MapPinGlyph />
          <span className="hidden sm:inline">Pick on map</span>
        </button>
      </div>

      {!picked ? (
        <p className="mt-1 text-xs text-ink/45">
          Search for an address, or use <strong className="font-medium">Pick on map</strong>{" "}
          if search is unavailable — patients see the pin you confirm.
        </p>
      ) : null}
      {picked ? (
        <p className="mt-1 text-xs text-sage">Location selected.</p>
      ) : null}

      {mapPlace ? (
        <LocationPinPickerModal
          initialAddress={mapPlace.address}
          lat={mapPlace.lat}
          lng={mapPlace.lng}
          heading={mapPlace.mapMode === "pick" ? "Pick location" : "Adjust pin"}
          onClose={() => setMapPlace(null)}
          onConfirm={({ lat, lng, address: pickedAddress, placeId }) => {
            const address =
              pickedAddress.trim() || mapAddressLabel(value, lat, lng);
            const baseId =
              mapPlace.mapMode === "pick"
                ? placeId || `map:manual:${lat.toFixed(5)},${lng.toFixed(5)}`
                : placeId ||
                  `${mapPlace.placeId}:adj:${lat.toFixed(5)},${lng.toFixed(5)}`;
            commit({
              address,
              lat,
              lng,
              placeId: baseId,
            });
          }}
        />
      ) : null}
    </div>
  );
}
