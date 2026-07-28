"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X, ExternalLink, Heart, Navigation, Plane } from "lucide-react";
import { useMapStore } from "@/store/map-store";
import { Button } from "@/components/ui/button";
import { formatAltitude, formatEta, formatSpeed } from "@/lib/utils";
import { altitudeColorHex } from "@/lib/altitude-color";
import { PlaybackScrubber } from "@/components/flight/PlaybackScrubber";
import type { LiveFlight } from "@/lib/types";

export function FlightInfoPanel() {
  const selectedFlightId = useMapStore((s) => s.selectedFlightId);
  const selectFlight = useMapStore((s) => s.selectFlight);
  const flights = useMapStore((s) => s.flights);
  const playbackMode = useMapStore((s) => s.playbackMode);
  const { data: session } = useSession();

  const flight = flights.find((f) => f.id === selectedFlightId);

  const { data: detail, isFetching } = useQuery({
    queryKey: ["flight", selectedFlightId],
    queryFn: async () => {
      const res = await fetch(`/api/flights/${selectedFlightId}`);
      if (!res.ok) throw new Error("not found");
      return res.json() as Promise<{ flight: LiveFlight; positions: unknown[] }>;
    },
    enabled: !!selectedFlightId,
    refetchInterval: 8000,
    staleTime: 4000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/favourites/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightId: selectedFlightId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (!selectedFlightId || !flight) return null;

  const f = detail?.flight ?? flight;
  const hasRoute =
    f.origin?.icao &&
    f.origin.icao !== "ZZZZ" &&
    f.destination?.icao &&
    f.destination.icao !== "ZZZZ";
  const altColor = altitudeColorHex(f.altitude);

  return (
    <div className="pointer-events-auto absolute bottom-16 right-3 top-20 z-20 flex w-[min(100%-1.5rem,380px)] flex-col md:bottom-4 md:top-24">
      <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-400/80">
              Live ADS-B · {f.icao24.toUpperCase()}
            </p>
            <h2 className="truncate font-[family-name:var(--font-display)] text-xl font-semibold text-white">
              {f.flightNumber}
            </h2>
            <p className="truncate text-sm text-slate-400">
              {f.airline?.name ?? "Unknown airline"}
              {f.airline?.iata ? ` (${f.airline.iata})` : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => selectFlight(null)} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          {/* Route */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Route</p>
              {isFetching && !hasRoute && (
                <p className="font-mono text-[10px] text-cyan-400/70">Resolving…</p>
              )}
            </div>
            {hasRoute ? (
              <>
                <div className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xl text-cyan-300">
                      {f.origin.iata ?? f.origin.icao}
                    </p>
                    <p className="truncate text-xs text-slate-300">{f.origin.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {f.origin.city}, {f.origin.country}
                    </p>
                  </div>
                  <div className="flex flex-col items-center pt-1">
                    <Plane className="h-4 w-4 text-slate-400" />
                    <Navigation className="mt-1 h-3 w-3 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="font-mono text-xl text-amber-300">
                      {f.destination.iata ?? f.destination.icao}
                    </p>
                    <p className="truncate text-xs text-slate-300">{f.destination.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {f.destination.city}, {f.destination.country}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-700"
                    style={{ width: `${Math.round(f.progress * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
                  <span>{Math.round(f.progress * 100)}% en route</span>
                  <span>ETA {formatEta(f.eta)}</span>
                  <span>{f.remainingNm} nm left</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                No scheduled route found for this callsign (common for GA, military, or unscheduled
                flights).
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Altitude" value={formatAltitude(f.altitude)} accent={altColor} />
            <Metric label="Ground speed" value={formatSpeed(f.speed)} />
            <Metric label="Track / HDG" value={`${f.heading}°`} />
            <Metric
              label="Vertical rate"
              value={`${f.verticalSpeed > 0 ? "+" : ""}${f.verticalSpeed} fpm`}
            />
            <Metric label="Aircraft" value={f.model} />
            <Metric label="Registration" value={f.registration} />
            <Metric label="Callsign" value={f.callsign} />
            <Metric
              label="Status"
              value={String(f.status).replace(/_/g, " ")}
            />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Position · </span>
              <span className="font-mono">
                {f.lat.toFixed(4)}°, {f.lon.toFixed(4)}°
              </span>
            </p>
            <p>
              <span className="text-slate-500">Distance · </span>
              {f.distanceNm > 0 ? `${f.distanceNm} nm route` : "—"}
            </p>
            <p>
              <span className="text-slate-500">Category · </span>
              <span className="capitalize">{f.type}</span>
            </p>
          </div>

          {playbackMode && detail?.positions && (
            <PlaybackScrubber positions={detail.positions as never} />
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/flight/${f.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Full detail
              </Link>
            </Button>
            {hasRoute && (
              <>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/airport/${f.origin.iata ?? f.origin.icao}`}>Departure</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/airport/${f.destination.iata ?? f.destination.icao}`}>
                    Arrival
                  </Link>
                </Button>
              </>
            )}
            {session?.user && (
              <Button
                size="sm"
                variant="amber"
                disabled={saveMutation.isPending || saveMutation.isSuccess}
                onClick={() => saveMutation.mutate()}
              >
                <Heart className="h-3.5 w-3.5" />
                {saveMutation.isSuccess ? "Saved" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono text-sm capitalize text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}
