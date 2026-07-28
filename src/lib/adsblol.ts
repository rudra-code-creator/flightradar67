import { classifyAircraft } from "./aircraft-category";
import type { FlightFilters, LiveFlight } from "./types";

const BASE = "https://api.adsb.lol";
const UA = "FlightRadar67/1.0 (+https://github.com/flightradar67; research)";

/** Hub tiles for global coverage (API radius capped ~250nm). */
const GLOBAL_TILES: { lat: number; lon: number; radius: number }[] = [
  { lat: 40.7, lon: -74.0, radius: 250 }, // NYC
  { lat: 33.9, lon: -118.4, radius: 250 }, // LAX
  { lat: 41.9, lon: -87.9, radius: 250 }, // ORD
  { lat: 32.9, lon: -97.0, radius: 250 }, // DFW
  { lat: 25.8, lon: -80.3, radius: 200 }, // MIA
  { lat: 51.5, lon: -0.45, radius: 250 }, // LHR
  { lat: 50.0, lon: 8.5, radius: 250 }, // FRA
  { lat: 41.8, lon: 12.2, radius: 200 }, // FCO
  { lat: 55.6, lon: 37.6, radius: 200 }, // SVO
  { lat: 25.25, lon: 55.36, radius: 250 }, // DXB
  { lat: 28.55, lon: 77.1, radius: 250 }, // DEL
  { lat: 1.36, lon: 103.99, radius: 250 }, // SIN
  { lat: 22.3, lon: 114.0, radius: 250 }, // HKG
  { lat: 35.55, lon: 139.78, radius: 250 }, // HND
  { lat: 31.14, lon: 121.8, radius: 250 }, // PVG
  { lat: -33.95, lon: 151.18, radius: 250 }, // SYD
  { lat: -37.67, lon: 144.84, radius: 200 }, // MEL
  { lat: -23.43, lon: -46.47, radius: 250 }, // GRU
  { lat: -26.14, lon: 28.25, radius: 250 }, // JNB
  { lat: 43.68, lon: -79.63, radius: 200 }, // YYZ
];

export interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  true_heading?: number;
  mag_heading?: number;
  baro_rate?: number;
  geom_rate?: number;
  squawk?: string;
  lat?: number;
  lon?: number;
  category?: string;
  seen?: number;
  seen_pos?: number;
  rssi?: number;
  messages?: number;
}

export interface AdsbResponse {
  ac?: AdsbAircraft[];
  msg?: string;
  now?: number;
  total?: number;
}

function altFt(ac: AdsbAircraft): number {
  if (ac.alt_baro === "ground") return 0;
  if (typeof ac.alt_baro === "number") return Math.round(ac.alt_baro);
  if (typeof ac.alt_geom === "number") return Math.round(ac.alt_geom);
  return 0;
}

export function mapAdsbToLiveFlight(ac: AdsbAircraft): LiveFlight | null {
  if (ac.lat == null || ac.lon == null) return null;
  if (!Number.isFinite(ac.lat) || !Number.isFinite(ac.lon)) return null;

  const callsign = (ac.flight ?? ac.r ?? ac.hex).trim() || ac.hex;
  const altitude = altFt(ac);
  const heading = Math.round(ac.true_heading ?? ac.track ?? ac.mag_heading ?? 0);
  const speed = Math.round(ac.gs ?? 0);
  const vs = Math.round(ac.baro_rate ?? ac.geom_rate ?? 0);
  const icao = callsign.replace(/\d.*/g, "").slice(0, 3) || ac.hex.slice(0, 3).toUpperCase();

  return {
    id: `adsb-${ac.hex.toLowerCase()}`,
    callsign,
    flightNumber: callsign,
    icao24: ac.hex.toLowerCase(),
    registration: (ac.r ?? ac.hex).toUpperCase(),
    model: ac.t ?? "Unknown",
    type: classifyAircraft({
      typecode: ac.t,
      category: ac.category,
      callsign: ac.flight ?? ac.r,
    }),
    status: altitude < 100 ? "landed" : vs < -500 ? "approaching" : "en_route",
    airline: {
      icao,
      iata: null,
      name: icao,
    },
    origin: {
      icao: "ZZZZ",
      iata: null,
      name: "—",
      city: "—",
      country: "—",
      lat: ac.lat,
      lon: ac.lon,
    },
    destination: {
      icao: "ZZZZ",
      iata: null,
      name: "—",
      city: "—",
      country: "—",
      lat: ac.lat,
      lon: ac.lon,
    },
    lat: ac.lat,
    lon: ac.lon,
    altitude,
    speed,
    heading,
    verticalSpeed: vs,
    progress: 0.5,
    distanceNm: 0,
    remainingNm: 0,
    eta: new Date(Date.now() + 3600_000).toISOString(),
    scheduledDep: new Date().toISOString(),
    scheduledArr: new Date(Date.now() + 3600_000).toISOString(),
    actualDep: new Date().toISOString(),
    updatedAt: Date.now(),
  };
}

async function fetchJson(url: string): Promise<AdsbResponse> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`adsb.lol HTTP ${res.status}`);
  return (await res.json()) as AdsbResponse;
}

export async function fetchAdsbNear(
  lat: number,
  lon: number,
  radiusNm = 250
): Promise<LiveFlight[]> {
  const r = Math.min(Math.max(radiusNm, 1), 250);
  const data = await fetchJson(`${BASE}/v2/point/${lat}/${lon}/${r}`);
  return (data.ac ?? [])
    .map(mapAdsbToLiveFlight)
    .filter((f): f is LiveFlight => f != null);
}

export async function fetchAdsbGlobal(): Promise<LiveFlight[]> {
  const results = await Promise.allSettled(
    GLOBAL_TILES.map((t) => fetchAdsbNear(t.lat, t.lon, t.radius))
  );
  const byId = new Map<string, LiveFlight>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value) byId.set(f.id, f);
  }
  return Array.from(byId.values());
}

export function filterLiveFlights(flights: LiveFlight[], filters: FlightFilters = {}) {
  let list = flights;

  // Viewport radius filter (primary — used by map polling)
  if (filters.lat != null && filters.lon != null && filters.radius != null) {
    const rLat = filters.lat;
    const rLon = filters.lon;
    const maxNm = Math.max(40, filters.radius) * 1.15;
    const maxDegLat = maxNm / 60;
    const cosLat = Math.max(0.2, Math.cos((rLat * Math.PI) / 180));
    const maxDegLon = maxDegLat / cosLat;
    list = list.filter((f) => {
      const dLat = Math.abs(f.lat - rLat);
      if (dLat > maxDegLat) return false;
      const dLon = Math.abs((((f.lon - rLon + 540) % 360) - 180));
      if (dLon > maxDegLon) return false;
      // Exact-ish range check for edge cases near the corners
      const nm =
        Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2);
      return nm <= maxNm;
    });
  }

  if (
    filters.west != null &&
    filters.south != null &&
    filters.east != null &&
    filters.north != null
  ) {
    list = list.filter(
      (f) =>
        f.lat >= filters.south! &&
        f.lat <= filters.north! &&
        f.lon >= filters.west! &&
        f.lon <= filters.east!
    );
  }
  if (filters.airline) {
    const q = filters.airline.toLowerCase();
    list = list.filter(
      (f) =>
        f.airline?.icao.toLowerCase() === q ||
        f.airline?.iata?.toLowerCase() === q ||
        f.airline?.name.toLowerCase().includes(q) ||
        f.callsign.toLowerCase().includes(q)
    );
  }
  if (filters.type && filters.type !== "all") {
    list = list.filter((f) => f.type === filters.type);
  }
  if (filters.minAltitude != null) {
    list = list.filter((f) => f.altitude >= filters.minAltitude!);
  }
  if (filters.maxAltitude != null) {
    list = list.filter((f) => f.altitude <= filters.maxAltitude!);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    list = list.filter(
      (f) =>
        f.callsign.toLowerCase().includes(q) ||
        f.registration.toLowerCase().includes(q) ||
        f.icao24.includes(q) ||
        f.model.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 5000;
  return { flights: list.slice(offset, offset + limit), total };
}
