import { NAIROBI_CENTER } from "@/lib/regions";

export type PlaceSuggestion = {
  id: string;
  address: string;
  lat: number;
  lng: number;
};

const GEO_UA = "JanellHealth/1.0 (local healthcare demo)";
const FETCH_MS = 7000;
/** Kenya bounding box: minLon,minLat,maxLon,maxLat */
const KENYA_BBOX = "33.9,-4.8,41.9,5.1";
const KENYA_LAT = { min: -4.8, max: 5.1 };
const KENYA_LNG = { min: 33.9, max: 41.9 };

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
};

type NominatimHit = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
};

function isInKenya(lat: number, lng: number): boolean {
  return (
    lat >= KENYA_LAT.min &&
    lat <= KENYA_LAT.max &&
    lng >= KENYA_LNG.min &&
    lng <= KENYA_LNG.max
  );
}

function formatPhotonAddress(props: PhotonFeature["properties"]): string {
  if (!props) return "";
  const line1 = [props.housenumber, props.street || props.name]
    .filter(Boolean)
    .join(" ");
  const parts = [
    line1 || props.name,
    props.district,
    props.city || props.county,
    props.state,
    props.country,
  ].filter((p, i, arr) => Boolean(p) && arr.indexOf(p) === i);
  return parts.join(", ");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": GEO_UA },
      signal: AbortSignal.timeout(FETCH_MS),
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fromPhoton(features: PhotonFeature[] | undefined): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  for (const f of features || []) {
    const coords = f.geometry?.coordinates;
    const props = f.properties;
    if (!coords || coords.length < 2 || !props) continue;
    const [lng, lat] = coords;
    const address = formatPhotonAddress(props);
    if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isInKenya(lat, lng)) continue;
    const osmType = props.osm_type || "n";
    const osmId = props.osm_id ?? `${lat},${lng}`;
    out.push({
      id: `osm:${osmType}:${osmId}`,
      address,
      lat,
      lng,
    });
  }
  return out;
}

function fromNominatim(hits: NominatimHit[] | undefined): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  for (const h of hits || []) {
    const lat = Number(h.lat);
    const lng = Number(h.lon);
    const address = (h.display_name || "").trim();
    if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!isInKenya(lat, lng)) continue;
    const osmType = (h.osm_type || "n")[0] || "n";
    const osmId = h.osm_id ?? h.place_id ?? `${lat},${lng}`;
    out.push({
      id: `osm:${osmType}:${osmId}`,
      address,
      lat,
      lng,
    });
  }
  return out;
}

async function searchPhoton(q: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lat", String(NAIROBI_CENTER.lat));
  url.searchParams.set("lon", String(NAIROBI_CENTER.lng));
  url.searchParams.set("bbox", KENYA_BBOX);
  url.searchParams.set("lang", "en");
  const data = await fetchJson<{ features?: PhotonFeature[] }>(url.toString());
  return fromPhoton(data?.features);
}

async function searchNominatim(q: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "ke");
  url.searchParams.set("viewbox", "36.45,-0.95,37.20,-1.55");
  url.searchParams.set("bounded", "0");
  const data = await fetchJson<NominatimHit[]>(url.toString());
  return fromNominatim(Array.isArray(data) ? data : undefined);
}

function queryTokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function tokenOverlap(address: string, tokens: string[]): number {
  const a = address.toLowerCase();
  return tokens.filter((t) => a.includes(t)).length;
}

function scorePlace(p: PlaceSuggestion, tokens: string[]): number {
  const a = p.address.toLowerCase();
  let score = tokenOverlap(a, tokens) * 6;
  if (a.includes("kenya")) score += 2;
  if (a.includes("nairobi") || a.includes("kiambu") || a.includes("ruiru")) {
    score += 2;
  }
  if (p.lat > -1.55 && p.lat < -1.05 && p.lng > 36.55 && p.lng < 37.15) {
    score += 3;
  }
  return score;
}

function mergePlaces(groups: PlaceSuggestion[][]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const merged: PlaceSuggestion[] = [];
  for (const group of groups) {
    for (const p of group) {
      const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      if (seen.has(key) || seen.has(p.id)) continue;
      seen.add(key);
      seen.add(p.id);
      merged.push(p);
    }
  }
  return merged;
}

export async function searchPlaces(q: string): Promise<PlaceSuggestion[]> {
  const tokens = queryTokens(q);
  const jobs: Promise<PlaceSuggestion[]>[] = [
    searchPhoton(q, 12),
    searchNominatim(q, 8),
  ];
  const extraTokens = tokens
    .filter((t) => t.toLowerCase() !== q.toLowerCase())
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
  for (const token of extraTokens) {
    jobs.push(searchPhoton(token, 8));
  }

  const groups = await Promise.all(jobs);
  return mergePlaces(groups)
    .sort((a, b) => scorePlace(b, tokens) - scorePlace(a, tokens))
    .slice(0, 8);
}
