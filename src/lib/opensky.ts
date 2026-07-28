import { classifyAircraft } from "./aircraft-category";
import { cacheGet, cacheSet } from "./redis";
import { getSimulator } from "./aviation-simulator";
import type { LiveFlight } from "./types";

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  geo_altitude: number | null;
  squawk: string | null;
}

function mapState(row: unknown[], index: number): LiveFlight | null {
  const [
    icao24,
    callsign,
    originCountry,
    ,
    ,
    lon,
    lat,
    baroAlt,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    ,
    geoAlt,
  ] = row as [
    string,
    string | null,
    string,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
    boolean,
    number | null,
    number | null,
    number | null,
    number | null,
    number | null,
  ];

  if (lat == null || lon == null || onGround) return null;

  const cs = (callsign ?? icao24).trim() || icao24;
  const altM = geoAlt ?? baroAlt ?? 0;
  const type = classifyAircraft({ callsign: cs });

  return {
    id: `osk-${icao24}`,
    callsign: cs,
    flightNumber: cs,
    icao24,
    registration: icao24.toUpperCase(),
    model: "Unknown",
    type,
    status: "en_route",
    airline: {
      icao: cs.slice(0, 3),
      iata: null,
      name: originCountry,
    },
    origin: {
      icao: "ZZZZ",
      iata: null,
      name: originCountry,
      city: originCountry,
      country: originCountry,
      lat: lat - 5,
      lon: lon - 5,
    },
    destination: {
      icao: "ZZZZ",
      iata: null,
      name: "En route",
      city: "—",
      country: "—",
      lat: lat + 5,
      lon: lon + 5,
    },
    lat,
    lon,
    altitude: Math.round(altM * 3.28084),
    speed: Math.round((velocity ?? 0) * 1.94384),
    heading: Math.round(trueTrack ?? 0),
    verticalSpeed: Math.round((verticalRate ?? 0) * 196.85),
    progress: 0.5,
    distanceNm: 0,
    remainingNm: 0,
    eta: new Date(Date.now() + 3600_000).toISOString(),
    scheduledDep: new Date().toISOString(),
    scheduledArr: new Date(Date.now() + 3600_000).toISOString(),
    actualDep: new Date().toISOString(),
    updatedAt: Date.now() + index,
  };
}

export async function fetchOpenSkyFlights(): Promise<LiveFlight[]> {
  const cacheKey = "opensky:states";
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as LiveFlight[];
    } catch {
      /* continue */
    }
  }

  const headers: HeadersInit = { Accept: "application/json" };
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      headers,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
    const data = (await res.json()) as { states?: unknown[][] };
    const flights = (data.states ?? [])
      .map((row, i) => mapState(row, i))
      .filter((f): f is LiveFlight => f != null)
      .slice(0, 5000);
    await cacheSet(cacheKey, JSON.stringify(flights), 10);
    return flights;
  } catch (err) {
    console.warn("[opensky] falling back to simulator:", (err as Error).message);
    return getSimulator().getFlights({ limit: 5000 }).flights;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLiveFlights(filters: import("./types").FlightFilters = {}) {
  const { getLiveTraffic } = await import("./live-traffic");
  const hub = getLiveTraffic();

  // Always scope to a viewport chunk — never pull the whole planet by default
  hub.setFocus(
    filters.lat ?? hub.getFocus().lat,
    filters.lon ?? hub.getFocus().lon,
    filters.radius ?? hub.getFocus().radius
  );

  hub.start();
  if (typeof hub.ready === "function") {
    await hub.ready();
  } else {
    await new Promise((r) => setTimeout(r, 2500));
  }
  return hub.getFlights(filters);
}

export type { OpenSkyState };
