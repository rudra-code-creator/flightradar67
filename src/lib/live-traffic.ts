import { fetchAdsbNear, filterLiveFlights } from "./adsblol";
import { getSimulator } from "./aviation-simulator";
import { fetchOpenSkyFlights } from "./opensky";
import type { FlightFilters, FlightPositionSample, LiveFlight } from "./types";

const POLL_MS = 3000;
const TRAIL_MAX = 120;
const TRAIL_MIN_DIST_DEG = 0.0003;

type Listener = (flights: LiveFlight[]) => void;

/** Adjacent offsets (deg) to cover a wider viewport in chunks of ≤250nm. */
function chunkCenters(lat: number, lon: number, radiusNm: number) {
  // ~1° lat ≈ 60nm; scale offsets from requested radius
  const step = Math.min(3.5, Math.max(1.2, (radiusNm / 60) * 0.85));
  const centers: { lat: number; lon: number; radius: number }[] = [
    { lat, lon, radius: Math.min(radiusNm, 250) },
  ];
  // Extra chunks only when looking at a wide area
  if (radiusNm >= 120) {
    for (const [dLat, dLon] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ] as const) {
      centers.push({
        lat: Math.max(-85, Math.min(85, lat + dLat)),
        lon: ((((lon + dLon) % 360) + 540) % 360) - 180,
        radius: Math.min(220, radiusNm),
      });
    }
  }
  if (radiusNm >= 200) {
    for (const [dLat, dLon] of [
      [step, step],
      [step, -step],
      [-step, step],
      [-step, -step],
    ] as const) {
      centers.push({
        lat: Math.max(-85, Math.min(85, lat + dLat)),
        lon: ((((lon + dLon) % 360) + 540) % 360) - 180,
        radius: Math.min(200, radiusNm),
      });
    }
  }
  return centers;
}

class LiveTrafficHub {
  private flights = new Map<string, LiveFlight>();
  private trails = new Map<string, FlightPositionSample[]>();
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private polling = false;
  private lastError: string | null = null;
  private source: "adsblol" | "opensky" | "simulator" = "adsblol";
  private focus: { lat: number; lon: number; radius: number } = {
    lat: -27.4,
    lon: 153.1,
    radius: 180,
  };
  private boot: Promise<void> | null = null;
  private focusGeneration = 0;

  start() {
    if (this.started) return;
    this.started = true;
    this.boot = this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
    if (typeof this.timer === "object" && "unref" in this.timer) {
      this.timer.unref?.();
    }
  }

  async ready() {
    this.start();
    if (this.boot) await this.boot;
    if (this.flights.size === 0) await this.poll();
  }

  setFocus(lat: number, lon: number, radiusNm: number) {
    const next = {
      lat,
      lon,
      radius: Math.min(Math.max(radiusNm, 40), 250),
    };
    const moved =
      Math.abs(next.lat - this.focus.lat) > 0.35 ||
      Math.abs(next.lon - this.focus.lon) > 0.35 ||
      Math.abs(next.radius - this.focus.radius) > 25;
    this.focus = next;
    if (moved) {
      this.focusGeneration++;
      // Drop aircraft outside the new view so far-side traffic disappears immediately
      this.pruneOutsideFocus();
      void this.poll();
    }
  }

  getFocus() {
    return this.focus;
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getFlights(filters: FlightFilters = {}) {
    this.start();
    return {
      ...filterLiveFlights(Array.from(this.flights.values()), filters),
      source: this.source,
      error: this.lastError,
      focus: this.focus,
    };
  }

  getFlight(id: string): LiveFlight | null {
    this.start();
    return this.flights.get(id) ?? null;
  }

  getTrail(id: string): FlightPositionSample[] {
    return this.trails.get(id)?.slice() ?? [];
  }

  private pruneOutsideFocus() {
    const { lat, lon, radius } = this.focus;
    const maxNm = radius * 1.2;
    const maxDegLat = maxNm / 60;
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const maxDegLon = maxDegLat / cosLat;
    for (const [id, f] of this.flights) {
      const dLat = Math.abs(f.lat - lat);
      const dLon = Math.abs((((f.lon - lon + 540) % 360) - 180));
      if (dLat > maxDegLat || dLon > maxDegLon) {
        this.flights.delete(id);
        this.trails.delete(id);
        continue;
      }
      const nm = Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2);
      if (nm > maxNm) {
        this.flights.delete(id);
        this.trails.delete(id);
      }
    }
  }

  private async poll() {
    if (this.polling) return;
    this.polling = true;
    const generation = this.focusGeneration;
    const preferred = (process.env.DATA_SOURCE ?? "adsblol").toLowerCase();

    try {
      let next: LiveFlight[] = [];
      if (preferred === "simulator") {
        next = getSimulator()
          .getFlights({
            limit: 2000,
            west: this.focus.lon - 8,
            east: this.focus.lon + 8,
            south: this.focus.lat - 6,
            north: this.focus.lat + 6,
          })
          .flights;
        this.source = "simulator";
      } else if (preferred === "opensky") {
        const all = await fetchOpenSkyFlights();
        // OpenSky is global — keep only the active viewport chunk
        const { lat, lon, radius } = this.focus;
        const maxNm = radius * 1.2;
        const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
        next = all.filter((f) => {
          const dLat = Math.abs(f.lat - lat);
          const dLon = Math.abs((((f.lon - lon + 540) % 360) - 180));
          const nm = Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2);
          return nm <= maxNm;
        });
        this.source = "opensky";
      } else {
        const chunks = chunkCenters(this.focus.lat, this.focus.lon, this.focus.radius);
        // Fetch chunks sequentially in small batches for speed + friendlier rate limits
        const batchSize = 3;
        const byId = new Map<string, LiveFlight>();
        for (let i = 0; i < chunks.length; i += batchSize) {
          if (generation !== this.focusGeneration) break;
          const batch = chunks.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((c) => fetchAdsbNear(c.lat, c.lon, c.radius))
          );
          for (const r of results) {
            if (r.status !== "fulfilled") continue;
            for (const f of r.value) byId.set(f.id, f);
          }
        }
        next = Array.from(byId.values());
        this.source = "adsblol";
        if (next.length === 0) {
          next = getSimulator()
            .getFlights({
              limit: 800,
              west: this.focus.lon - 6,
              east: this.focus.lon + 6,
              south: this.focus.lat - 5,
              north: this.focus.lat + 5,
            })
            .flights;
          this.source = "simulator";
          this.lastError = "adsb.lol empty for viewport — simulator fallback";
        } else {
          this.lastError = null;
        }
      }

      if (generation !== this.focusGeneration) return;

      const now = Date.now();
      const seen = new Set<string>();
      for (const f of next) {
        f.updatedAt = now;
        seen.add(f.id);
        this.flights.set(f.id, f);
        this.pushTrail(f, now);
      }

      // Drop anything outside the focus (and anything missed by this poll)
      this.pruneOutsideFocus();
      for (const [id, f] of this.flights) {
        if (!seen.has(id) && now - f.updatedAt > 8_000) {
          this.flights.delete(id);
          this.trails.delete(id);
        }
      }

      const snapshot = Array.from(this.flights.values());
      for (const cb of this.listeners) cb(snapshot);
    } catch (err) {
      this.lastError = (err as Error).message;
      console.warn("[live-traffic]", this.lastError);
    } finally {
      this.polling = false;
    }
  }

  private pushTrail(f: LiveFlight, now: number) {
    let trail = this.trails.get(f.id);
    if (!trail) {
      trail = [];
      this.trails.set(f.id, trail);
    }
    const last = trail[trail.length - 1];
    if (
      last &&
      Math.abs(last.lat - f.lat) < TRAIL_MIN_DIST_DEG &&
      Math.abs(last.lon - f.lon) < TRAIL_MIN_DIST_DEG
    ) {
      return;
    }
    trail.push({
      lat: f.lat,
      lon: f.lon,
      altitude: f.altitude,
      speed: f.speed,
      heading: f.heading,
      verticalSpeed: f.verticalSpeed,
      recordedAt: now,
    });
    if (trail.length > TRAIL_MAX) trail.splice(0, trail.length - TRAIL_MAX);
  }
}

const globalForHub = globalThis as unknown as { __fr67TrafficV4?: LiveTrafficHub };

export function getLiveTraffic(): LiveTrafficHub {
  if (!globalForHub.__fr67TrafficV4) {
    globalForHub.__fr67TrafficV4 = new LiveTrafficHub();
  }
  return globalForHub.__fr67TrafficV4;
}
