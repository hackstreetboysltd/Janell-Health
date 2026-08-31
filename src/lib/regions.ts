export type NairobiRegion = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

/** Region centroids for static map pins (no live tracking). */
export const NAIROBI_REGIONS: NairobiRegion[] = [
  { id: "westlands", name: "Westlands", lat: -1.2673, lng: 36.811 },
  { id: "kilimani", name: "Kilimani", lat: -1.289, lng: 36.785 },
  { id: "karen", name: "Karen", lat: -1.3197, lng: 36.7115 },
  { id: "eastlands", name: "Eastlands", lat: -1.2864, lng: 36.8915 },
  { id: "cbd", name: "CBD", lat: -1.2864, lng: 36.8172 },
  { id: "south-b", name: "South B", lat: -1.3105, lng: 36.837 },
  { id: "south-c", name: "South C", lat: -1.322, lng: 36.832 },
  { id: "kasarani", name: "Kasarani", lat: -1.221, lng: 36.896 },
  { id: "langata", name: "Langata", lat: -1.333, lng: 36.776 },
  { id: "parklands", name: "Parklands", lat: -1.261, lng: 36.817 },
  { id: "embakasi", name: "Embakasi", lat: -1.322, lng: 36.895 },
];

export const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };

/** Rough metro bounds for validating caregiver pins. */
export const NAIROBI_BOUNDS = {
  minLat: NAIROBI_CENTER.lat - 0.35,
  maxLat: NAIROBI_CENTER.lat + 0.35,
  minLng: NAIROBI_CENTER.lng - 0.35,
  maxLng: NAIROBI_CENTER.lng + 0.35,
};

export function isWithinNairobiBounds(lat: number, lng: number): boolean {
  return (
    lat >= NAIROBI_BOUNDS.minLat &&
    lat <= NAIROBI_BOUNDS.maxLat &&
    lng >= NAIROBI_BOUNDS.minLng &&
    lng <= NAIROBI_BOUNDS.maxLng
  );
}

export function caregiverLocationLabel(
  address: string | null | undefined,
  regionName: string,
): string {
  const trimmed = address?.trim();
  return trimmed || regionName;
}

export function getRegionById(id: string): NairobiRegion | undefined {
  return NAIROBI_REGIONS.find((r) => r.id === id);
}

/** Closest preset area to a pin (kept for filters / fallback labels). */
export function nearestRegion(lat: number, lng: number): NairobiRegion {
  let best = NAIROBI_REGIONS[0]!;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const region of NAIROBI_REGIONS) {
    const km = haversineKm({ lat, lng }, region);
    if (km < bestKm) {
      bestKm = km;
      best = region;
    }
  }
  return best;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
