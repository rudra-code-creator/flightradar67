import { create } from "zustand";
import type { AircraftCategory, AirportRef, LiveFlight } from "@/lib/types";

export interface MapFilters {
  airline: string;
  type: AircraftCategory | "all";
  minAltitude: number;
  maxAltitude: number;
  showAirports: boolean;
  showWeather: boolean;
  showLabels: boolean;
  clusterWhenZoomedOut: boolean;
}

export interface ViewportFocus {
  lat: number;
  lon: number;
  radiusNm: number;
}

export interface CameraFlyTo {
  lat: number;
  lon: number;
  height: number;
  nonce: number;
}

interface MapState {
  flights: LiveFlight[];
  selectedFlightId: string | null;
  selectedAirport: AirportRef | null;
  cameraFlyTo: CameraFlyTo | null;
  filters: MapFilters;
  viewport: ViewportFocus;
  sidebarOpen: boolean;
  radarOpen: boolean;
  playbackMode: boolean;
  playbackIndex: number;
  followSelected: boolean;
  setFlights: (flights: LiveFlight[]) => void;
  upsertFlights: (flights: LiveFlight[]) => void;
  /** Merge updates; drop stale aircraft and anything outside the active viewport */
  mergeFlights: (
    flights: LiveFlight[],
    opts?: { maxAgeMs?: number; viewport?: ViewportFocus; maxRadiusNm?: number }
  ) => void;
  selectFlight: (id: string | null) => void;
  selectAirport: (airport: AirportRef | null) => void;
  requestFlyTo: (lat: number, lon: number, height?: number) => void;
  setFilters: (partial: Partial<MapFilters>) => void;
  setViewport: (viewport: ViewportFocus) => void;
  setSidebarOpen: (open: boolean) => void;
  setRadarOpen: (open: boolean) => void;
  setPlaybackMode: (on: boolean) => void;
  setPlaybackIndex: (i: number) => void;
  setFollowSelected: (on: boolean) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  flights: [],
  selectedFlightId: null,
  selectedAirport: null,
  cameraFlyTo: null,
  filters: {
    airline: "",
    type: "all",
    minAltitude: 0,
    maxAltitude: 50000,
    showAirports: true,
    showWeather: false,
    showLabels: false,
    clusterWhenZoomedOut: true,
  },
  viewport: { lat: -27.4, lon: 153.1, radiusNm: 180 },
  sidebarOpen: true,
  radarOpen: false,
  playbackMode: false,
  playbackIndex: 0,
  followSelected: false,
  setFlights: (flights) => set({ flights }),
  upsertFlights: (incoming) => {
    const map = new Map(get().flights.map((f) => [f.id, f]));
    for (const f of incoming) map.set(f.id, f);
    set({ flights: Array.from(map.values()) });
  },
  mergeFlights: (incoming, opts) => {
    const now = Date.now();
    const maxAgeMs = opts?.maxAgeMs ?? 20_000;
    const vp = opts?.viewport ?? get().viewport;
    const maxNm = opts?.maxRadiusNm ?? vp.radiusNm * 1.25;
    const cosLat = Math.max(0.2, Math.cos((vp.lat * Math.PI) / 180));

    const inView = (f: LiveFlight) => {
      const dLat = Math.abs(f.lat - vp.lat);
      const dLon = Math.abs((((f.lon - vp.lon + 540) % 360) - 180));
      const nm = Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2);
      return nm <= maxNm;
    };

    const map = new Map<string, LiveFlight>();
    // Keep only still-fresh, in-viewport aircraft from previous state
    for (const f of get().flights) {
      if (now - (f.updatedAt || 0) <= maxAgeMs && inView(f)) map.set(f.id, f);
    }
    for (const f of incoming) {
      if (!inView(f)) continue;
      map.set(f.id, { ...f, updatedAt: f.updatedAt || now });
    }
    set({ flights: Array.from(map.values()) });
  },
  selectFlight: (id) =>
    set({
      selectedFlightId: id,
      selectedAirport: id ? null : get().selectedAirport,
    }),
  selectAirport: (airport) =>
    set({
      selectedAirport: airport,
      selectedFlightId: airport ? null : get().selectedFlightId,
      followSelected: airport ? false : get().followSelected,
    }),
  requestFlyTo: (lat, lon, height = 450_000) =>
    set({
      cameraFlyTo: { lat, lon, height, nonce: Date.now() },
      viewport: {
        lat,
        lon,
        radiusNm: Math.min(180, Math.max(80, get().viewport.radiusNm)),
      },
    }),
  setFilters: (partial) => set({ filters: { ...get().filters, ...partial } }),
  setViewport: (viewport) => set({ viewport }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setRadarOpen: (radarOpen) => set({ radarOpen }),
  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setPlaybackIndex: (playbackIndex) => set({ playbackIndex }),
  setFollowSelected: (followSelected) => set({ followSelected }),
}));
