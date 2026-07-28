/** Fetch real ADS-B tracks (readsb traces) from adsb.lol — includes turns & curves. */

import { haversineNm } from "./geo";
import type { FlightPositionSample } from "./types";

const TRACE_BASE = "https://adsb.lol/data/traces";
const UA = "FlightRadar67/1.0 (+research; ODbL attribution to adsb.lol)";
const cache = new Map<string, { at: number; points: FlightPositionSample[] }>();
const TTL_MS = 2 * 60_000;
/** Long oceanic legs (e.g. Honiara→BNE) need plenty of vertices */
const MAX_POINTS = 1800;

type TraceRow = unknown[];

interface TraceFile {
  icao?: string;
  timestamp?: number;
  trace?: TraceRow[];
}

export type TrackOriginHint = { lat: number; lon: number; icao?: string };

function hexBucket(hex: string) {
  const h = hex.toLowerCase().replace(/[^0-9a-f]/g, "");
  return h.slice(-2).padStart(2, "0");
}

function normalizeHex(icao24: string) {
  return icao24.toLowerCase().replace(/^adsb-/, "").replace(/[^0-9a-f]/g, "");
}

function parseAlt(v: unknown): number {
  if (v === "ground") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
  return 0;
}

function isDepartureAltitude(alt: unknown): boolean {
  if (alt === "ground") return true;
  if (typeof alt === "number" && Number.isFinite(alt) && alt < 4000) return true;
  return false;
}

/**
 * Slice to the current flight.
 * Ignores false mid-air "leg" flags (common on long routes) so the path
 * keeps going back to the real departure (e.g. Honiara), not a mid-route break.
 */
function sliceCurrentLeg(rows: TraceRow[], origin?: TrackOriginHint): TraceRow[] {
  if (rows.length < 2) return rows;

  const breaks: number[] = [0];
  for (let i = 0; i < rows.length; i++) {
    const flags = rows[i]?.[6];
    if (typeof flags === "number" && (flags & 2) !== 0) breaks.push(i);
  }

  // Only treat ground / low-altitude breaks as real departures
  const departures = breaks.filter((idx) => isDepartureAltitude(rows[idx]?.[3]));

  let start = 0;

  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lon)) {
    // Prefer the latest departure near the scheduled origin
    let found = false;
    for (let i = departures.length - 1; i >= 0; i--) {
      const idx = departures[i]!;
      const row = rows[idx]!;
      const lat = row[1];
      const lon = row[2];
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      if (haversineNm(origin.lat, origin.lon, lat, lon) <= 120) {
        start = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      // Walk backward from the latest sample to the closest low-alt fix near origin
      let bestIdx = -1;
      let bestDist = Infinity;
      const scanFrom = Math.max(0, rows.length - 8000);
      for (let i = rows.length - 1; i >= scanFrom; i--) {
        const row = rows[i]!;
        const lat = row[1];
        const lon = row[2];
        if (typeof lat !== "number" || typeof lon !== "number") continue;
        if (!isDepartureAltitude(row[3])) continue;
        const d = haversineNm(origin.lat, origin.lon, lat, lon);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestDist <= 80) {
        start = bestIdx;
        while (start > 0 && isDepartureAltitude(rows[start - 1]?.[3])) start--;
      } else if (departures.length) {
        start = departures[departures.length - 1]!;
      }
    }
  } else if (departures.length) {
    start = departures[departures.length - 1]!;
  }
  // else: no reliable departure → keep full trace rather than truncating on false flags

  return rows.slice(start);
}

/** Keep path shape: denser around heading/altitude changes, thinner on straight cruise. */
function downsample(points: FlightPositionSample[], max = MAX_POINTS): FlightPositionSample[] {
  if (points.length <= max) return points;
  const out: FlightPositionSample[] = [points[0]!];
  const step = points.length / max;
  let acc = step;
  let lastHdg = points[0]!.heading;
  let lastAlt = points[0]!.altitude;

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const dHdg = Math.abs((((p.heading - lastHdg + 540) % 360) - 180));
    const dAlt = Math.abs(p.altitude - lastAlt);
    const interesting = dHdg > 6 || dAlt > 600;
    if (interesting || i >= acc) {
      out.push(p);
      lastHdg = p.heading;
      lastAlt = p.altitude;
      if (!interesting) acc += step;
      else acc = i + step;
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

function rowsToSamples(timestamp: number, rows: TraceRow[]): FlightPositionSample[] {
  const samples: FlightPositionSample[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const dt = row[0];
    const lat = row[1];
    const lon = row[2];
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const alt = parseAlt(row[3]);
    const spd = typeof row[4] === "number" ? Math.round(row[4]) : 0;
    const hdg = typeof row[5] === "number" ? Math.round(row[5]) : 0;
    const vs = typeof row[7] === "number" ? Math.round(row[7]) : 0;
    const t =
      typeof dt === "number" && Number.isFinite(timestamp)
        ? Math.round((timestamp + dt) * 1000)
        : Date.now();

    samples.push({
      lat,
      lon,
      altitude: alt,
      speed: spd,
      heading: ((hdg % 360) + 360) % 360,
      verticalSpeed: vs,
      recordedAt: t,
    });
  }
  return samples;
}

/** Ensure the path reaches the departure airport when ADS-B started after takeoff. */
function ensureOriginAnchor(
  samples: FlightPositionSample[],
  origin?: TrackOriginHint
): FlightPositionSample[] {
  if (!origin || samples.length === 0) return samples;
  if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) return samples;
  if (Math.abs(origin.lat) < 0.01 && Math.abs(origin.lon) < 0.01) return samples;

  const first = samples[0]!;
  const dist = haversineNm(origin.lat, origin.lon, first.lat, first.lon);
  if (dist < 2) return samples;
  if (dist > 400) return samples; // don't invent a huge stub for wrong origin

  const anchor: FlightPositionSample = {
    lat: origin.lat,
    lon: origin.lon,
    altitude: 0,
    speed: 0,
    heading: first.heading,
    verticalSpeed: 0,
    recordedAt: Math.max(0, (first.recordedAt || Date.now()) - 60_000),
  };
  return [anchor, ...samples];
}

async function fetchTraceFile(hex: string, kind: "full" | "recent"): Promise<TraceFile | null> {
  const bucket = hexBucket(hex);
  const url = `${TRACE_BASE}/${bucket}/trace_${kind}_${hex}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
    signal: AbortSignal.timeout(18_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as TraceFile;
}

/**
 * Real flown path for an ICAO24 hex from adsb.lol readsb traces.
 * Pass origin when known so mid-air false leg breaks don't truncate the trail.
 */
export async function fetchAdsbLolTrack(
  icao24: string,
  origin?: TrackOriginHint
): Promise<FlightPositionSample[]> {
  const hex = normalizeHex(icao24);
  if (hex.length < 6) return [];

  const originKey = origin?.icao
    ? origin.icao
    : origin
      ? `${origin.lat.toFixed(2)},${origin.lon.toFixed(2)}`
      : "";
  const cacheKey = `${hex}:${originKey}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.points;

  try {
    // Always prefer full-day trace so oceanic legs aren't truncated
    let file = await fetchTraceFile(hex, "full");
    if (!file?.trace?.length) file = await fetchTraceFile(hex, "recent");
    if (!file?.trace?.length) {
      cache.set(cacheKey, { at: Date.now(), points: [] });
      return [];
    }

    const leg = sliceCurrentLeg(file.trace, origin);
    let samples = downsample(rowsToSamples(file.timestamp ?? 0, leg));
    samples = ensureOriginAnchor(samples, origin);
    cache.set(cacheKey, { at: Date.now(), points: samples });
    return samples;
  } catch {
    cache.set(cacheKey, { at: Date.now(), points: [] });
    return [];
  }
}

/** Merge historical track + live trail, preferring denser real samples. */
export function mergeTracks(
  historical: FlightPositionSample[],
  live: FlightPositionSample[]
): FlightPositionSample[] {
  if (!historical.length) return live.slice();
  if (!live.length) return historical.slice();

  const lastHist = historical[historical.length - 1]!;
  const liveTail = live.filter((p) => {
    if (p.recordedAt && lastHist.recordedAt && p.recordedAt <= lastHist.recordedAt) return false;
    const dLat = Math.abs(p.lat - lastHist.lat);
    const dLon = Math.abs(p.lon - lastHist.lon);
    return dLat > 0.002 || dLon > 0.002 || (p.recordedAt ?? 0) > (lastHist.recordedAt ?? 0) + 5000;
  });
  // Never downsample below historical start — keep full departure→now shape
  return downsample([...historical, ...liveTail], MAX_POINTS);
}
