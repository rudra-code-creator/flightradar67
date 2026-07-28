"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Building2,
  CloudSun,
  ClipboardList,
  ExternalLink,
  MapPin,
  Clock,
  Mountain,
  PlaneTakeoff,
  PlaneLanding,
} from "lucide-react";
import { useMapStore } from "@/store/map-store";
import { Button } from "@/components/ui/button";
import { ArrivalsDepartures } from "@/components/airport/ArrivalsDepartures";
import type { LiveFlight } from "@/lib/types";

type AirportApi = {
  airport: {
    icao: string;
    iata: string | null;
    name: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
    timezone?: string | null;
    elevation?: number | null;
    runways?: { id: string; heading: number; lengthFt: number }[] | null;
  };
  arrivals: LiveFlight[];
  departures: LiveFlight[];
  weather: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    weather_code?: number;
  } | null;
};

function formatLocalTime(timezone?: string | null) {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return null;
  }
}

export function AirportInfoPanel() {
  const selectedAirport = useMapStore((s) => s.selectedAirport);
  const selectAirport = useMapStore((s) => s.selectAirport);
  const [showBoard, setShowBoard] = useState(false);

  const code = selectedAirport?.iata ?? selectedAirport?.icao ?? null;

  useEffect(() => {
    setShowBoard(false);
  }, [code]);

  const { data, isFetching } = useQuery({
    queryKey: ["airport", code],
    queryFn: async () => {
      const res = await fetch(`/api/airports/${encodeURIComponent(code!)}`);
      if (!res.ok) throw new Error("not found");
      return res.json() as Promise<AirportApi>;
    },
    enabled: !!code,
    staleTime: 30_000,
  });

  const a = data?.airport ?? selectedAirport;
  const weather = data?.weather;
  const arrivals = data?.arrivals ?? [];
  const departures = data?.departures ?? [];
  const runways = data?.airport?.runways ?? [];
  const localTime = useMemo(
    () => formatLocalTime(a?.timezone ?? selectedAirport?.timezone),
    [a?.timezone, selectedAirport?.timezone]
  );

  if (!selectedAirport || !a) return null;

  const boardHref = `/airport/${a.iata ?? a.icao}`;

  return (
    <div className="pointer-events-auto absolute bottom-16 right-3 top-20 z-20 flex w-[min(100%-1.5rem,400px)] flex-col md:bottom-4 md:top-24">
      <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-300/90">
              Airport · {a.icao}
            </p>
            <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold text-white">
              {a.iata ?? a.icao}
            </h2>
            <p className="truncate text-sm text-slate-300">{a.name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              {a.city}, {a.country}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectAirport(null)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          {isFetching && !data && (
            <p className="font-mono text-xs text-cyan-400/70">Loading airport…</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-cyan-300">
                <CloudSun className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Weather</span>
              </div>
              <p className="font-mono text-2xl text-white">
                {weather?.temperature_2m != null
                  ? `${Math.round(weather.temperature_2m)}°C`
                  : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Wind{" "}
                {weather?.wind_speed_10m != null
                  ? `${Math.round(weather.wind_speed_10m)} kt`
                  : "—"}
                {weather?.wind_direction_10m != null
                  ? ` / ${weather.wind_direction_10m}°`
                  : ""}
              </p>
              {weather?.relative_humidity_2m != null && (
                <p className="text-[11px] text-slate-500">
                  Humidity {Math.round(weather.relative_humidity_2m)}%
                </p>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Local</span>
              </div>
              <p className="font-mono text-xl text-white">{localTime ?? "—"}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {a.timezone ?? "Timezone unknown"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-amber-300">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Airport info</span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[10px] uppercase text-slate-500">IATA</dt>
                <dd className="font-mono text-slate-200">{a.iata ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-slate-500">ICAO</dt>
                <dd className="font-mono text-slate-200">{a.icao}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-slate-500">City</dt>
                <dd className="truncate text-slate-200">{a.city}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-slate-500">Country</dt>
                <dd className="truncate text-slate-200">{a.country}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase text-slate-500">Coordinates</dt>
                <dd className="font-mono text-xs text-slate-300">
                  {a.lat.toFixed(4)}°, {a.lon.toFixed(4)}°
                </dd>
              </div>
              {(data?.airport?.elevation != null) && (
                <div className="col-span-2 flex items-center gap-2">
                  <Mountain className="h-3.5 w-3.5 text-slate-500" />
                  <div>
                    <dt className="text-[10px] uppercase text-slate-500">Elevation</dt>
                    <dd className="font-mono text-slate-200">
                      {data.airport.elevation.toLocaleString()} ft
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {runways.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                Runways ({runways.length})
              </p>
              <ul className="space-y-1.5">
                {runways.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-white/10 bg-slate-950/50 px-2.5 py-1.5 font-mono text-xs text-slate-300"
                  >
                    {r.id} · hdg {r.heading}° · {r.lengthFt.toLocaleString()} ft
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1.5 text-cyan-300">
                <PlaneLanding className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Arrivals</span>
              </div>
              <p className="font-mono text-lg text-white">{arrivals.length}</p>
              <p className="text-[10px] text-slate-500">in live picture</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="mb-0.5 flex items-center gap-1.5 text-amber-300">
                <PlaneTakeoff className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Departures</span>
              </div>
              <p className="font-mono text-lg text-white">{departures.length}</p>
              <p className="text-[10px] text-slate-500">in live picture</p>
            </div>
          </div>

          <Button asChild className="w-full" variant="amber">
            <Link href={boardHref}>
              <ExternalLink className="h-4 w-4" />
              Open arrivals / departures board
            </Link>
          </Button>

          {!showBoard ? (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => setShowBoard(true)}
            >
              <ClipboardList className="h-4 w-4" />
              Preview board here
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Board preview
                </p>
                <Button size="sm" variant="ghost" onClick={() => setShowBoard(false)}>
                  Hide
                </Button>
              </div>
              <ArrivalsDepartures arrivals={arrivals} departures={departures} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
