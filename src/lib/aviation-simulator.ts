import {
  cruiseAltitudeProfile,
  haversineNm,
  initialBearing,
  interpolateGreatCircle,
  normalizeHeading,
  inBBox,
  type BBox,
} from "./geo";
import { MAJOR_AIRPORTS } from "./major-airports";
import type {
  AircraftCategory,
  AirlineRef,
  AirportRef,
  FlightFilters,
  FlightPositionSample,
  LiveFlight,
  LiveFlightStatus,
  StatisticsSnapshot,
} from "./types";

interface SimAirport extends AirportRef {
  timezone: string;
}

interface SimAirline extends AirlineRef {
  country: string;
}

interface InternalFlight {
  id: string;
  callsign: string;
  flightNumber: string;
  icao24: string;
  registration: string;
  model: string;
  type: AircraftCategory;
  airline: SimAirline | null;
  origin: SimAirport;
  destination: SimAirport;
  cruiseFt: number;
  cruiseSpeedKt: number;
  progress: number;
  distanceNm: number;
  startedAt: number;
  durationMs: number;
  history: FlightPositionSample[];
  lastHistoryAt: number;
}

const AIRPORTS: SimAirport[] = MAJOR_AIRPORTS.map((a) => ({
  icao: a.icao,
  iata: a.iata,
  name: a.name,
  city: a.city,
  country: a.country,
  lat: a.lat,
  lon: a.lon,
  timezone: a.timezone,
}));

const AIRLINES: SimAirline[] = [
  { icao: "QFA", iata: "QF", name: "Qantas", country: "Australia" },
  { icao: "SIA", iata: "SQ", name: "Singapore Airlines", country: "Singapore" },
  { icao: "BAW", iata: "BA", name: "British Airways", country: "United Kingdom" },
  { icao: "UAL", iata: "UA", name: "United Airlines", country: "United States" },
  { icao: "AAL", iata: "AA", name: "American Airlines", country: "United States" },
  { icao: "DAL", iata: "DL", name: "Delta Air Lines", country: "United States" },
  { icao: "UAE", iata: "EK", name: "Emirates", country: "United Arab Emirates" },
  { icao: "CPA", iata: "CX", name: "Cathay Pacific", country: "Hong Kong" },
  { icao: "ANA", iata: "NH", name: "All Nippon Airways", country: "Japan" },
  { icao: "JAL", iata: "JL", name: "Japan Airlines", country: "Japan" },
  { icao: "DLH", iata: "LH", name: "Lufthansa", country: "Germany" },
  { icao: "AFR", iata: "AF", name: "Air France", country: "France" },
  { icao: "KLM", iata: "KL", name: "KLM", country: "Netherlands" },
  { icao: "CCA", iata: "CA", name: "Air China", country: "China" },
  { icao: "THA", iata: "TG", name: "Thai Airways", country: "Thailand" },
  { icao: "VOZ", iata: "VA", name: "Virgin Australia", country: "Australia" },
  { icao: "JBU", iata: "B6", name: "JetBlue", country: "United States" },
  { icao: "FDX", iata: "FX", name: "FedEx", country: "United States" },
  { icao: "UPS", iata: "5X", name: "UPS Airlines", country: "United States" },
  { icao: "ACA", iata: "AC", name: "Air Canada", country: "Canada" },
];

const MODELS: Record<AircraftCategory, string[]> = {
  commercial: ["A320", "A321neo", "A330-300", "A350-900", "A380-800", "B737-800", "B777-300ER", "B787-9", "B747-8"],
  cargo: ["B747-8F", "B777F", "MD-11F", "A330-200F"],
  private: ["G650", "Citation X", "Global 7500", "Phenom 300", "King Air 350"],
};

const TICK_MS = 2500;
const HISTORY_INTERVAL_MS = 30_000;
const MAX_HISTORY = 80;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function statusFromProgress(p: number): LiveFlightStatus {
  if (p < 0.02) return "departed";
  if (p < 0.08) return "en_route";
  if (p < 0.9) return "en_route";
  if (p < 0.98) return "approaching";
  return "landed";
}

function toLive(f: InternalFlight, now: number): LiveFlight {
  const elapsed = Math.max(0, now - f.startedAt);
  let progress = Math.min(0.999, elapsed / f.durationMs);
  if (progress >= 0.999) {
    // Will be respawned on tick
    progress = 0.999;
  }
  const pos = interpolateGreatCircle(
    f.origin.lat,
    f.origin.lon,
    f.destination.lat,
    f.destination.lon,
    progress
  );
  const next = interpolateGreatCircle(
    f.origin.lat,
    f.origin.lon,
    f.destination.lat,
    f.destination.lon,
    Math.min(1, progress + 0.002)
  );
  const heading = normalizeHeading(initialBearing(pos.lat, pos.lon, next.lat, next.lon));
  const altitude = cruiseAltitudeProfile(progress, f.cruiseFt);
  const prevAlt = cruiseAltitudeProfile(Math.max(0, progress - 0.01), f.cruiseFt);
  const verticalSpeed = ((altitude - prevAlt) / (0.01 * f.durationMs)) * 60_000;
  const speedFactor = progress < 0.1 || progress > 0.9 ? 0.55 + progress * 0.3 : 1;
  const speed = f.cruiseSpeedKt * speedFactor;
  const remainingNm = f.distanceNm * (1 - progress);
  const etaMs = now + (remainingNm / Math.max(speed, 80)) * 3600_000;
  const scheduledDep = new Date(f.startedAt - 20 * 60_000).toISOString();
  const scheduledArr = new Date(f.startedAt + f.durationMs).toISOString();

  return {
    id: f.id,
    callsign: f.callsign,
    flightNumber: f.flightNumber,
    icao24: f.icao24,
    registration: f.registration,
    model: f.model,
    type: f.type,
    status: statusFromProgress(progress),
    airline: f.airline
      ? { icao: f.airline.icao, iata: f.airline.iata, name: f.airline.name }
      : null,
    origin: f.origin,
    destination: f.destination,
    lat: pos.lat,
    lon: pos.lon,
    altitude: Math.round(altitude),
    speed: Math.round(speed),
    heading: Math.round(heading),
    verticalSpeed: Math.round(verticalSpeed),
    progress,
    distanceNm: Math.round(f.distanceNm),
    remainingNm: Math.round(remainingNm),
    eta: new Date(etaMs).toISOString(),
    scheduledDep,
    scheduledArr,
    actualDep: new Date(f.startedAt).toISOString(),
    updatedAt: now,
  };
}

class AviationSimulator {
  private flights = new Map<string, InternalFlight>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(flights: LiveFlight[]) => void>();
  private tickCount = 0;
  private started = false;
  private rng = mulberry32(67);

  start(count?: number) {
    if (this.started) return;
    this.started = true;
    const n = count ?? Number(process.env.SIMULATOR_AIRCRAFT_COUNT ?? 3000);
    this.spawnFleet(Math.min(Math.max(n, 100), 10000));
    this.timer = setInterval(() => this.tick(), TICK_MS);
    if (typeof this.timer === "object" && "unref" in this.timer) {
      this.timer.unref?.();
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.started = false;
  }

  subscribe(cb: (flights: LiveFlight[]) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getAirports(): SimAirport[] {
    return AIRPORTS;
  }

  getAirlines(): SimAirline[] {
    return AIRLINES;
  }

  getFlight(id: string): LiveFlight | null {
    this.ensure();
    const f = this.flights.get(id);
    if (!f) return null;
    return toLive(f, Date.now());
  }

  getFlightHistory(id: string): FlightPositionSample[] {
    this.ensure();
    return this.flights.get(id)?.history.slice() ?? [];
  }

  getFlights(filters: FlightFilters = {}): { flights: LiveFlight[]; total: number } {
    this.ensure();
    const now = Date.now();
    let list = Array.from(this.flights.values()).map((f) => toLive(f, now));

    if (
      filters.west != null &&
      filters.south != null &&
      filters.east != null &&
      filters.north != null
    ) {
      const bbox: BBox = {
        west: filters.west,
        south: filters.south,
        east: filters.east,
        north: filters.north,
      };
      list = list.filter((f) => inBBox(f.lat, f.lon, bbox));
    }

    if (filters.airline) {
      const q = filters.airline.toLowerCase();
      list = list.filter(
        (f) =>
          f.airline?.icao.toLowerCase() === q ||
          f.airline?.iata?.toLowerCase() === q ||
          f.airline?.name.toLowerCase().includes(q)
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
          f.flightNumber.toLowerCase().includes(q) ||
          f.registration.toLowerCase().includes(q) ||
          f.origin.iata?.toLowerCase() === q ||
          f.destination.iata?.toLowerCase() === q
      );
    }

    const total = list.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 5000;
    return { flights: list.slice(offset, offset + limit), total };
  }

  getStatistics(): StatisticsSnapshot {
    this.ensure();
    const { flights } = this.getFlights({ limit: 20000 });
    const byType: Record<AircraftCategory, number> = { commercial: 0, cargo: 0, private: 0 };
    const airlineMap = new Map<string, { icao: string; name: string; count: number }>();
    const airportMap = new Map<
      string,
      { code: string; name: string; city: string; arrivals: number; departures: number }
    >();

    let altSum = 0;
    let spdSum = 0;
    let airborne = 0;

    for (const f of flights) {
      byType[f.type]++;
      if (f.status === "en_route" || f.status === "approaching" || f.status === "departed") {
        airborne++;
        altSum += f.altitude;
        spdSum += f.speed;
      }
      if (f.airline) {
        const prev = airlineMap.get(f.airline.icao) ?? {
          icao: f.airline.icao,
          name: f.airline.name,
          count: 0,
        };
        prev.count++;
        airlineMap.set(f.airline.icao, prev);
      }
      const depCode = f.origin.iata ?? f.origin.icao;
      const arrCode = f.destination.iata ?? f.destination.icao;
      const dep = airportMap.get(depCode) ?? {
        code: depCode,
        name: f.origin.name,
        city: f.origin.city,
        arrivals: 0,
        departures: 0,
      };
      dep.departures++;
      airportMap.set(depCode, dep);
      const arr = airportMap.get(arrCode) ?? {
        code: arrCode,
        name: f.destination.name,
        city: f.destination.city,
        arrivals: 0,
        departures: 0,
      };
      arr.arrivals++;
      airportMap.set(arrCode, arr);
    }

    return {
      totalFlights: flights.length,
      airborne,
      byType,
      byAirline: Array.from(airlineMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      busyAirports: Array.from(airportMap.values())
        .map((a) => ({ ...a, total: a.arrivals + a.departures }))
        .sort((a, b) => b.arrivals + b.departures - (a.arrivals + a.departures))
        .slice(0, 12)
        .map(({ code, name, city, arrivals, departures }) => ({
          code,
          name,
          city,
          arrivals,
          departures,
        })),
      avgAltitude: airborne ? Math.round(altSum / airborne) : 0,
      avgSpeed: airborne ? Math.round(spdSum / airborne) : 0,
      updatedAt: Date.now(),
    };
  }

  getAirportBoard(code: string) {
    this.ensure();
    const upper = code.toUpperCase();
    const airport =
      AIRPORTS.find((a) => a.icao === upper || a.iata === upper) ?? null;
    if (!airport) return null;
    const { flights } = this.getFlights({ limit: 20000 });
    const arrivals = flights
      .filter(
        (f) =>
          f.destination.icao === airport.icao || f.destination.iata === airport.iata
      )
      .sort((a, b) => a.remainingNm - b.remainingNm)
      .slice(0, 40);
    const departures = flights
      .filter(
        (f) => f.origin.icao === airport.icao || f.origin.iata === airport.iata
      )
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 40);
    return { airport, arrivals, departures };
  }

  search(q: string, limit = 20) {
    this.ensure();
    const query = q.trim().toLowerCase();
    if (!query) return { flights: [], airports: [], airlines: [] };

    const airports = AIRPORTS.filter(
      (a) =>
        a.icao.toLowerCase().includes(query) ||
        a.iata?.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        a.city.toLowerCase().includes(query)
    ).slice(0, limit);

    const airlines = AIRLINES.filter(
      (a) =>
        a.icao.toLowerCase().includes(query) ||
        a.iata?.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query)
    ).slice(0, limit);

    const { flights } = this.getFlights({ q: query, limit });
    return { flights, airports, airlines };
  }

  private ensure() {
    if (!this.started) this.start();
  }

  private spawnFleet(count: number) {
    this.flights.clear();
    for (let i = 0; i < count; i++) {
      this.flights.set(`sim-${i}`, this.createFlight(i));
    }
  }

  private createFlight(index: number): InternalFlight {
    const rng = () => this.rng();
    const typeRoll = rng();
    const type: AircraftCategory =
      typeRoll < 0.08 ? "cargo" : typeRoll < 0.14 ? "private" : "commercial";

    const origin = pick(rng, AIRPORTS);
    let destination = pick(rng, AIRPORTS);
    let attempts = 0;
    while (
      (destination.icao === origin.icao ||
        haversineNm(origin.lat, origin.lon, destination.lat, destination.lon) < 200) &&
      attempts < 20
    ) {
      destination = pick(rng, AIRPORTS);
      attempts++;
    }

    const airline =
      type === "private"
        ? null
        : type === "cargo"
          ? pick(
              rng,
              AIRLINES.filter((a) => a.icao === "FDX" || a.icao === "UPS")
            )
          : pick(
              rng,
              AIRLINES.filter((a) => a.icao !== "FDX" && a.icao !== "UPS")
            );

    const distanceNm = haversineNm(origin.lat, origin.lon, destination.lat, destination.lon);
    const cruiseSpeedKt =
      type === "private" ? 420 + rng() * 80 : type === "cargo" ? 460 + rng() * 40 : 450 + rng() * 90;
    const cruiseFt =
      type === "private" ? 35000 + rng() * 10000 : 32000 + rng() * 9000;
    const durationMs = (distanceNm / cruiseSpeedKt) * 3600_000;
    const progress = rng() * 0.92;
    const startedAt = Date.now() - progress * durationMs;
    const num = 100 + (index % 900);
    const flightNumber = `${airline?.iata ?? "PVT"}${num}`;
    const callsign = `${airline?.icao ?? "PVT"}${num}`;

    const flight: InternalFlight = {
      id: `sim-${index}`,
      callsign,
      flightNumber,
      icao24: (0xabc000 + index).toString(16),
      registration: `${airline?.country === "Australia" ? "VH" : airline?.iata ?? "N"}-${String(index).padStart(4, "0")}`,
      model: pick(rng, MODELS[type]),
      type,
      airline,
      origin,
      destination,
      cruiseFt,
      cruiseSpeedKt,
      progress,
      distanceNm,
      startedAt,
      durationMs,
      history: [],
      lastHistoryAt: 0,
    };

    // Seed sparse history
    const now = Date.now();
    for (let h = 0; h < 8; h++) {
      const p = Math.max(0, progress - (8 - h) * 0.02);
      const pos = interpolateGreatCircle(
        origin.lat,
        origin.lon,
        destination.lat,
        destination.lon,
        p
      );
      flight.history.push({
        lat: pos.lat,
        lon: pos.lon,
        altitude: cruiseAltitudeProfile(p, cruiseFt),
        speed: cruiseSpeedKt,
        heading: initialBearing(pos.lat, pos.lon, destination.lat, destination.lon),
        verticalSpeed: 0,
        recordedAt: now - (8 - h) * HISTORY_INTERVAL_MS,
      });
    }
    flight.lastHistoryAt = now;

    return flight;
  }

  private tick() {
    this.tickCount++;
    const now = Date.now();
    const updates: LiveFlight[] = [];

    for (const [id, f] of this.flights) {
      const elapsed = now - f.startedAt;
      if (elapsed >= f.durationMs) {
        const respawned = this.createFlight(Number(id.replace("sim-", "")) || this.tickCount);
        respawned.id = id;
        this.flights.set(id, respawned);
        updates.push(toLive(respawned, now));
        continue;
      }

      const live = toLive(f, now);
      f.progress = live.progress;

      if (now - f.lastHistoryAt >= HISTORY_INTERVAL_MS) {
        f.history.push({
          lat: live.lat,
          lon: live.lon,
          altitude: live.altitude,
          speed: live.speed,
          heading: live.heading,
          verticalSpeed: live.verticalSpeed,
          recordedAt: now,
        });
        if (f.history.length > MAX_HISTORY) f.history.shift();
        f.lastHistoryAt = now;
      }

      updates.push(live);
    }

    // Notify listeners with a thinned set for SSE efficiency (all IDs, compact)
    for (const cb of this.listeners) {
      try {
        cb(updates);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}

const globalForSim = globalThis as unknown as { __aviationSim?: AviationSimulator };

export function getSimulator(): AviationSimulator {
  if (!globalForSim.__aviationSim) {
    globalForSim.__aviationSim = new AviationSimulator();
  }
  globalForSim.__aviationSim.start();
  return globalForSim.__aviationSim;
}

export { AIRPORTS as SIM_AIRPORTS, AIRLINES as SIM_AIRLINES };
