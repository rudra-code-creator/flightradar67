/** Great-circle / geo helpers for aviation routes */

const EARTH_RADIUS_NM = 3440.065;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function toRad(deg: number) {
  return deg * DEG2RAD;
}

export function toDeg(rad: number) {
  return rad * RAD2DEG;
}

export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function initialBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Sample a great-circle as lat/lon points (inclusive endpoints). */
export function sampleGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  samples = 64
): { lat: number; lon: number }[] {
  const n = Math.max(2, samples);
  const out: { lat: number; lon: number }[] = [];
  for (let i = 0; i < n; i++) {
    out.push(interpolateGreatCircle(lat1, lon1, lat2, lon2, i / (n - 1)));
  }
  return out;
}

/** Interpolate along great-circle; fraction in [0,1] */
export function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): { lat: number; lon: number } {
  const f = Math.min(1, Math.max(0, fraction));
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
      )
    );

  if (d < 1e-10) return { lat: lat1, lon: lon1 };

  const a = Math.sin((1 - f) * d) / Math.sin(d);
  const b = Math.sin(f * d) / Math.sin(d);
  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);
  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);
  return { lat: toDeg(φ), lon: toDeg(λ) };
}

export function destinationPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceNm: number
): { lat: number; lon: number } {
  const δ = distanceNm / EARTH_RADIUS_NM;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lon: ((toDeg(λ2) + 540) % 360) - 180 };
}

export function normalizeHeading(h: number) {
  return ((h % 360) + 360) % 360;
}

export type BBox = { west: number; south: number; east: number; north: number };

export function inBBox(lat: number, lon: number, bbox: BBox): boolean {
  const { west, south, east, north } = bbox;
  if (south > lat || lat > north) return false;
  if (west <= east) return lon >= west && lon <= east;
  return lon >= west || lon <= east;
}

export function cruiseAltitudeProfile(progress: number, cruiseFt: number): number {
  const climbEnd = 0.12;
  const descentStart = 0.85;
  if (progress < climbEnd) {
    const t = progress / climbEnd;
    return 1500 + (cruiseFt - 1500) * (1 - Math.pow(1 - t, 2));
  }
  if (progress > descentStart) {
    const t = (progress - descentStart) / (1 - descentStart);
    return cruiseFt * (1 - t * t) + 800 * t;
  }
  return cruiseFt + Math.sin(progress * Math.PI * 4) * 200;
}
