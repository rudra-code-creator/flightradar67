/** Smooth client-side tracks: dead-reckon between ADS-B fixes (FR24-style). */

import { destinationPoint } from "./geo";
import type { FlightPositionSample } from "./types";

export type LivePosition = {
  lat: number;
  lon: number;
  alt: number;
  hdg: number;
  spd: number;
  vs: number;
  prog: number;
  st: string;
  updatedAt: number;
};

type Track = {
  /** Last ADS-B / feed fix */
  fixLat: number;
  fixLon: number;
  fixAlt: number;
  fixHdg: number;
  fixSpd: number;
  fixVs: number;
  fixAt: number;
  prog: number;
  st: string;
  /** Display state (continuously advanced) */
  lat: number;
  lon: number;
  alt: number;
  hdg: number;
  spd: number;
  vs: number;
  /** Soft correction toward next fix so icons never snap */
  corrLat: number;
  corrLon: number;
  corrAlt: number;
  lastTick: number;
};

const tracks = new Map<string, Track>();
const trails = new Map<string, FlightPositionSample[]>();
const listeners = new Set<() => void>();

const TRAIL_MAX = 160;
const TRAIL_MIN_DIST = 0.00025;
/** Cap dead-reckon so a stuck feed doesn't fly forever */
const MAX_COAST_MS = 45_000;
/** Blend residual fix error over this many seconds */
const CORRECT_TAU_S = 4;

function normalizeLon(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function shortestLonDelta(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function tickTrack(t: Track, now: number) {
  const dtMs = Math.max(0, Math.min(now - t.lastTick, 2500));
  t.lastTick = now;
  if (dtMs <= 0) return;

  const coastMs = now - t.fixAt;
  const dtS = dtMs / 1000;

  // Dead-reckon along track while the last fix is fresh enough
  if (coastMs < MAX_COAST_MS && t.spd > 20) {
    const distNm = (t.spd / 3600) * dtS;
    if (distNm > 0) {
      const next = destinationPoint(t.lat, t.lon, t.hdg, distNm);
      t.lat = next.lat;
      t.lon = normalizeLon(next.lon);
    }
    // Vertical speed is ft/min
    t.alt = Math.max(0, t.alt + (t.vs / 60) * dtS);
  }

  // Ease out residual snap from last fix update
  if (t.corrLat !== 0 || t.corrLon !== 0 || t.corrAlt !== 0) {
    const k = 1 - Math.exp(-dtS / CORRECT_TAU_S);
    const dLat = t.corrLat * k;
    const dLon = t.corrLon * k;
    const dAlt = t.corrAlt * k;
    t.lat += dLat;
    t.lon = normalizeLon(t.lon + dLon);
    t.alt = Math.max(0, t.alt + dAlt);
    t.corrLat -= dLat;
    t.corrLon -= dLon;
    t.corrAlt -= dAlt;
    if (Math.abs(t.corrLat) < 1e-7) t.corrLat = 0;
    if (Math.abs(t.corrLon) < 1e-7) t.corrLon = 0;
    if (Math.abs(t.corrAlt) < 0.5) t.corrAlt = 0;
  }
}

/** Advance all tracks; call once per animation frame from the map. */
export function tickLivePositions(now = Date.now()) {
  for (const t of tracks.values()) tickTrack(t, now);
}

export function getLivePosition(id: string): LivePosition | undefined {
  const t = tracks.get(id);
  if (!t) return undefined;
  tickTrack(t, Date.now());
  return {
    lat: t.lat,
    lon: t.lon,
    alt: t.alt,
    hdg: t.hdg,
    spd: t.spd,
    vs: t.vs,
    prog: t.prog,
    st: t.st,
    updatedAt: t.fixAt,
  };
}

export function getLivePositionMap(): ReadonlyMap<string, LivePosition> {
  const now = Date.now();
  const out = new Map<string, LivePosition>();
  for (const [id, t] of tracks) {
    tickTrack(t, now);
    out.set(id, {
      lat: t.lat,
      lon: t.lon,
      alt: t.alt,
      hdg: t.hdg,
      spd: t.spd,
      vs: t.vs,
      prog: t.prog,
      st: t.st,
      updatedAt: t.fixAt,
    });
  }
  return out;
}

export function getClientTrail(id: string): FlightPositionSample[] {
  return trails.get(id)?.slice() ?? [];
}

function pushTrail(
  id: string,
  lat: number,
  lon: number,
  alt: number,
  hdg: number,
  spd: number,
  vs: number,
  ts: number
) {
  let trail = trails.get(id);
  if (!trail) {
    trail = [];
    trails.set(id, trail);
  }
  const last = trail[trail.length - 1];
  if (last && Math.abs(last.lat - lat) < TRAIL_MIN_DIST && Math.abs(last.lon - lon) < TRAIL_MIN_DIST) {
    return;
  }
  trail.push({
    lat,
    lon,
    altitude: alt,
    speed: spd,
    heading: hdg,
    verticalSpeed: vs,
    recordedAt: ts,
  });
  if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
}

function ingestFix(
  id: string,
  lat: number,
  lon: number,
  alt: number,
  hdg: number,
  spd: number,
  vs: number,
  prog: number,
  st: string,
  ts: number
) {
  const existing = tracks.get(id);
  if (!existing) {
    tracks.set(id, {
      fixLat: lat,
      fixLon: lon,
      fixAlt: alt,
      fixHdg: hdg,
      fixSpd: spd,
      fixVs: vs,
      fixAt: ts,
      prog,
      st,
      lat,
      lon,
      alt,
      hdg,
      spd,
      vs,
      corrLat: 0,
      corrLon: 0,
      corrAlt: 0,
      lastTick: ts,
    });
    pushTrail(id, lat, lon, alt, hdg, spd, vs, ts);
    return;
  }

  // Catch display up to "now" before applying the new fix
  tickTrack(existing, ts);

  existing.fixLat = lat;
  existing.fixLon = lon;
  existing.fixAlt = alt;
  existing.fixHdg = hdg;
  existing.fixSpd = spd;
  existing.fixVs = vs;
  existing.fixAt = ts;
  existing.prog = prog;
  existing.st = st;
  existing.spd = spd;
  existing.vs = vs;

  // Heading: ease large turns; small changes apply immediately
  let dHdg = ((hdg - existing.hdg + 540) % 360) - 180;
  if (Math.abs(dHdg) > 45) existing.hdg = hdg;
  else existing.hdg = (existing.hdg + dHdg * 0.55 + 360) % 360;

  // Soft-correct display toward the new fix instead of teleporting
  const errLat = lat - existing.lat;
  const errLon = shortestLonDelta(existing.lon, lon);
  const errAlt = alt - existing.alt;
  const errNm = Math.hypot(errLat * 60, errLon * 60 * Math.cos((existing.lat * Math.PI) / 180));

  if (errNm > 25) {
    // Teleport only on huge jumps (new track / bad data)
    existing.lat = lat;
    existing.lon = lon;
    existing.alt = alt;
    existing.hdg = hdg;
    existing.corrLat = 0;
    existing.corrLon = 0;
    existing.corrAlt = 0;
  } else {
    existing.corrLat += errLat;
    existing.corrLon += errLon;
    existing.corrAlt += errAlt;
  }

  pushTrail(id, lat, lon, alt, hdg, spd, vs, ts);
}

export function applyLivePositions(
  rows: {
    id: string;
    lat: number;
    lon: number;
    alt: number;
    hdg: number;
    spd: number;
    vs: number;
    prog: number;
    st: string;
  }[],
  ts: number
) {
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(r.id);
    ingestFix(r.id, r.lat, r.lon, r.alt, r.hdg, r.spd, r.vs, r.prog, r.st, ts);
  }
  // Drop tracks that vanished from the feed for a long time
  for (const [id, t] of tracks) {
    if (!seen.has(id) && ts - t.fixAt > MAX_COAST_MS) {
      tracks.delete(id);
      trails.delete(id);
    }
  }
  for (const cb of listeners) cb();
}

export function seedLivePositionsFromFlights(
  flights: {
    id: string;
    lat: number;
    lon: number;
    altitude: number;
    heading: number;
    speed: number;
    verticalSpeed: number;
    progress: number;
    status: string;
  }[]
) {
  const ts = Date.now();
  for (const f of flights) {
    ingestFix(
      f.id,
      f.lat,
      f.lon,
      f.altitude,
      f.heading,
      f.speed,
      f.verticalSpeed,
      f.progress,
      f.status,
      ts
    );
  }
}

/** Soft-remove tracks not refreshed recently (map entity grace). */
export function pruneStaleTracks(maxAgeMs = MAX_COAST_MS) {
  const now = Date.now();
  for (const [id, t] of tracks) {
    if (now - t.fixAt > maxAgeMs) {
      tracks.delete(id);
      trails.delete(id);
    }
  }
}

export function subscribeLivePositions(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
