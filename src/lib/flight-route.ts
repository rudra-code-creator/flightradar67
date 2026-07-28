import type { AirlineRef, AirportRef, LiveFlight } from "./types";

export interface RouteLookup {
  origin: AirportRef;
  destination: AirportRef;
  airline: AirlineRef | null;
  callsignIata: string | null;
}

const cache = new Map<string, { at: number; route: RouteLookup | null }>();
const TTL_MS = 30 * 60_000;

function parseAdsbdb(data: unknown): RouteLookup | null {
  const root = data as {
    response?: {
      flightroute?: {
        callsign_iata?: string | null;
        airline?: {
          name?: string;
          icao?: string;
          iata?: string | null;
        } | null;
        origin?: {
          icao_code?: string;
          iata_code?: string;
          name?: string;
          municipality?: string;
          country_name?: string;
          latitude?: number;
          longitude?: number;
        };
        destination?: {
          icao_code?: string;
          iata_code?: string;
          name?: string;
          municipality?: string;
          country_name?: string;
          latitude?: number;
          longitude?: number;
        };
      };
    };
  };

  const fr = root.response?.flightroute;
  if (!fr?.origin?.icao_code || !fr?.destination?.icao_code) return null;

  const toAirport = (a: NonNullable<typeof fr.origin>): AirportRef => ({
    icao: a.icao_code!,
    iata: a.iata_code ?? null,
    name: a.name ?? a.icao_code!,
    city: a.municipality ?? "—",
    country: a.country_name ?? "—",
    lat: a.latitude ?? 0,
    lon: a.longitude ?? 0,
  });

  return {
    origin: toAirport(fr.origin),
    destination: toAirport(fr.destination!),
    airline: fr.airline?.icao
      ? {
          icao: fr.airline.icao,
          iata: fr.airline.iata ?? null,
          name: fr.airline.name ?? fr.airline.icao,
        }
      : null,
    callsignIata: fr.callsign_iata ?? null,
  };
}

/** Resolve scheduled route for a callsign (adsbdb, cached). */
export async function lookupFlightRoute(callsign: string): Promise<RouteLookup | null> {
  const key = callsign.trim().toUpperCase().replace(/\s+/g, "");
  // Require an airline prefix + flight number — bare ICAO/registrations yield garbage matches
  if (!key || key.length < 4 || !/^[A-Z]{2,3}\d/.test(key)) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.route;

  try {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FlightRadar67/1.0 (+research)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cache.set(key, { at: Date.now(), route: null });
      return null;
    }
    const route = parseAdsbdb(await res.json());
    cache.set(key, { at: Date.now(), route });
    return route;
  } catch {
    cache.set(key, { at: Date.now(), route: null });
    return null;
  }
}

/** Max extra path length (nm) vs great-circle before a scheduled route is rejected. */
function routeSlackLimitNm(routeDistNm: number) {
  return Math.max(350, routeDistNm * 0.12);
}

export async function enrichFlightWithRoute(flight: LiveFlight): Promise<LiveFlight> {
  const route = await lookupFlightRoute(flight.callsign);
  if (!route) return flight;

  const distNm =
    haversineNm(route.origin.lat, route.origin.lon, route.destination.lat, route.destination.lon) ||
    flight.distanceNm;

  const flown = haversineNm(route.origin.lat, route.origin.lon, flight.lat, flight.lon);
  const toDest = haversineNm(flight.lat, flight.lon, route.destination.lat, route.destination.lon);
  // Cross-track proxy: how far off the great-circle corridor the aircraft is
  const corridorSlackNm = Math.max(0, flown + toDest - distNm);
  const slackLimit = routeSlackLimitNm(distNm);
  const plausible = corridorSlackNm <= slackLimit;

  // Scheduled callsign databases are often wrong/stale — never paint a route the plane isn't on
  if (!plausible) return flight;

  const progress = distNm > 0 ? Math.min(0.99, Math.max(0.01, flown / distNm)) : flight.progress;
  const remainingNm = Math.max(0, Math.round(distNm * (1 - progress)));
  const hoursLeft = flight.speed > 50 ? remainingNm / flight.speed : 2;

  return {
    ...flight,
    flightNumber: route.callsignIata ?? flight.flightNumber,
    airline: route.airline ?? flight.airline,
    origin: route.origin,
    destination: route.destination,
    distanceNm: Math.round(distNm),
    remainingNm,
    progress,
    eta: new Date(Date.now() + hoursLeft * 3600_000).toISOString(),
  };
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3440.065;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
