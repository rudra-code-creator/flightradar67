"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navbar, MobileNav, LiveBadge } from "@/components/layout/Navbar";
import { SidebarFilters } from "@/components/layout/SidebarFilters";
import { FlightInfoPanel } from "@/components/flight/FlightInfoPanel";
import { AirportInfoPanel } from "@/components/airport/AirportInfoPanel";
import { RadarAI } from "@/components/RadarAI";
import { AltitudeLegend } from "@/components/map/AltitudeLegend";
import { useMapStore } from "@/store/map-store";
import {
  applyLivePositions,
  seedLivePositionsFromFlights,
} from "@/lib/live-positions";
import type { LiveFlight } from "@/lib/types";
const CesiumFlightMap = dynamic(() => import("@/components/map/CesiumFlightMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#070b14]">
      <p className="font-mono text-sm tracking-widest text-cyan-300/70">LOADING LIVE RADAR…</p>
    </div>
  ),
});

type CompactFlight = {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  hdg: number;
  spd: number;
  vs: number;
  prog: number;
  st: string;
  callsign?: string;
  model?: string;
  type?: LiveFlight["type"];
  reg?: string;
};

function compactToFlight(c: CompactFlight, prev?: LiveFlight): LiveFlight {
  return {
    id: c.id,
    callsign: c.callsign ?? prev?.callsign ?? c.id,
    flightNumber: c.callsign ?? prev?.flightNumber ?? c.id,
    icao24: c.id.replace(/^adsb-/, ""),
    registration: c.reg ?? prev?.registration ?? c.id,
    model: c.model ?? prev?.model ?? "Unknown",
    type: c.type ?? prev?.type ?? "commercial",
    status: (c.st as LiveFlight["status"]) ?? "en_route",
    airline: prev?.airline ?? {
      icao: (c.callsign ?? "ZZZ").slice(0, 3),
      iata: null,
      name: (c.callsign ?? "ZZZ").slice(0, 3),
    },
    origin: prev?.origin ?? {
      icao: "ZZZZ",
      iata: null,
      name: "—",
      city: "—",
      country: "—",
      lat: c.lat,
      lon: c.lon,
    },
    destination: prev?.destination ?? {
      icao: "ZZZZ",
      iata: null,
      name: "—",
      city: "—",
      country: "—",
      lat: c.lat,
      lon: c.lon,
    },
    lat: c.lat,
    lon: c.lon,
    altitude: c.alt,
    speed: c.spd,
    heading: c.hdg,
    verticalSpeed: c.vs,
    progress: c.prog,
    distanceNm: prev?.distanceNm ?? 0,
    remainingNm: prev?.remainingNm ?? 0,
    eta: prev?.eta ?? new Date(Date.now() + 3600_000).toISOString(),
    scheduledDep: prev?.scheduledDep ?? new Date().toISOString(),
    scheduledArr: prev?.scheduledArr ?? new Date(Date.now() + 3600_000).toISOString(),
    actualDep: prev?.actualDep ?? new Date().toISOString(),
    updatedAt: Date.now(),
  };
}

export function MapDashboard() {
  const mergeFlights = useMapStore((s) => s.mergeFlights);
  const setFilters = useMapStore((s) => s.setFilters);
  const flights = useMapStore((s) => s.flights);
  const filters = useMapStore((s) => s.filters);
  const viewport = useMapStore((s) => s.viewport);
  const selectedFlightId = useMapStore((s) => s.selectedFlightId);
  const [source, setSource] = useState("adsblol");
  const [loading, setLoading] = useState(true);
  const lastMetaSync = useRef(0);

  const visibleCount = useMemo(() => {
    return flights.filter((f) => {
      if (filters.type !== "all" && f.type !== filters.type) return false;
      if (filters.airline) {
        const q = filters.airline.toLowerCase();
        const match =
          f.airline?.icao.toLowerCase() === q ||
          f.airline?.iata?.toLowerCase() === q ||
          f.airline?.name.toLowerCase().includes(q) ||
          f.callsign.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (f.altitude < filters.minAltitude || f.altitude > filters.maxAltitude) return false;
      return true;
    }).length;
  }, [flights, filters.type, filters.airline, filters.minAltitude, filters.maxAltitude]);

  useEffect(() => {
    setFilters({
      airline: "",
      type: "all",
      minAltitude: 0,
      maxAltitude: 50000,
    });
  }, [setFilters]);

  const ingestFlights = useCallback(
    (list: LiveFlight[], src?: string) => {
      seedLivePositionsFromFlights(list);
      const vp = useMapStore.getState().viewport;
      // Merge only in-viewport aircraft — never keep antipodal leftovers
      mergeFlights(list, { maxAgeMs: 20_000, viewport: vp, maxRadiusNm: vp.radiusNm * 1.25 });
      if (src) setSource(src);
      setLoading(false);
    },
    [mergeFlights]
  );

  // Viewport-scoped chunked polling (not the whole planet)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const { lat, lon, radiusNm } = useMapStore.getState().viewport;
        const typeFilter = useMapStore.getState().filters.type;
        const qs = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          radius: String(Math.round(radiusNm)),
          limit: "1500",
        });
        if (typeFilter !== "all") qs.set("type", typeFilter);
        const res = await fetch(`/api/flights?${qs}`);
        const json = await res.json();
        if (cancelled || !json?.flights) return;
        ingestFlights(json.flights as LiveFlight[], json.source ?? "adsblol");
      } catch {
        /* retry */
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => void load(), 3500);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ingestFlights, viewport.lat, viewport.lon, viewport.radiusNm, filters.type]);

  // Drop leftover far-side aircraft as soon as the camera focus moves
  useEffect(() => {
    mergeFlights([], {
      maxAgeMs: 20_000,
      viewport,
      maxRadiusNm: viewport.radiusNm * 1.25,
    });
  }, [viewport.lat, viewport.lon, viewport.radiusNm, mergeFlights]);

  // SSE deltas for aircraft already in the active viewport hub
  useEffect(() => {
    const es = new EventSource("/api/stream/flights");

    const onCompact = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as {
          flights: CompactFlight[];
          ts: number;
          source?: string;
        };
        const compact = payload.flights ?? [];
        const now = Date.now();
        const vp = useMapStore.getState().viewport;
        // Only accept SSE rows inside the camera viewport (hub can briefly lag)
        const cosLat = Math.max(0.2, Math.cos((vp.lat * Math.PI) / 180));
        const maxNm = vp.radiusNm * 1.25;
        const inView = (c: CompactFlight) => {
          const dLat = Math.abs(c.lat - vp.lat);
          const dLon = Math.abs((((c.lon - vp.lon + 540) % 360) - 180));
          return Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2) <= maxNm;
        };
        const visible = compact.filter(inView);

        applyLivePositions(visible, payload.ts);
        if (payload.source) setSource(payload.source);

        if (now - lastMetaSync.current > 4000 || useMapStore.getState().flights.length === 0) {
          lastMetaSync.current = now;
          const prevMap = new Map(useMapStore.getState().flights.map((f) => [f.id, f]));
          mergeFlights(
            visible.map((c) => compactToFlight(c, prevMap.get(c.id))),
            { maxAgeMs: 20_000, viewport: vp, maxRadiusNm: maxNm }
          );
        } else if (selectedFlightId) {
          const row = visible.find((c) => c.id === selectedFlightId);
          if (row) {
            const current = useMapStore.getState().flights;
            const prev = current.find((f) => f.id === selectedFlightId);
            if (prev) {
              mergeFlights([compactToFlight(row, prev)], {
                maxAgeMs: 20_000,
                viewport: vp,
                maxRadiusNm: maxNm,
              });
            }
          }
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("snapshot", (ev) => onCompact(ev as MessageEvent));
    es.addEventListener("update", (ev) => onCompact(ev as MessageEvent));
    return () => es.close();
  }, [selectedFlightId, mergeFlights]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#070b14]">
      <CesiumFlightMap />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.06),transparent_45%)]" />
      <Navbar />
      <SidebarFilters />
      <FlightInfoPanel />
      <AirportInfoPanel />
      <RadarAI />
      <LiveBadge
        count={visibleCount}
        source={loading ? `${source} · loading chunk…` : source}
      />
      <AltitudeLegend />
      <MobileNav />
    </div>
  );
}
