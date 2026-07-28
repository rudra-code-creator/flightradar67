"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plane, Building2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMapStore } from "@/store/map-store";
import { cn } from "@/lib/utils";
import type { AirportRef } from "@/lib/types";

type SearchAirport = {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string | null;
};

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selectFlight = useMapStore((s) => s.selectFlight);
  const selectAirport = useMapStore((s) => s.selectAirport);
  const requestFlyTo = useMapStore((s) => s.requestFlyTo);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      return res.json();
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    setOpen(q.trim().length >= 2);
  }, [q]);

  const focusAirport = (a: SearchAirport) => {
    const airport: AirportRef = {
      icao: a.icao,
      iata: a.iata,
      name: a.name,
      city: a.city,
      country: a.country,
      lat: a.lat,
      lon: a.lon,
      timezone: a.timezone ?? null,
    };
    selectAirport(airport);
    requestFlyTo(a.lat, a.lon, 420_000);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder="Search flights, airports, airlines…"
          className="border-white/10 bg-slate-950/70 pl-9 pr-9 backdrop-blur-xl"
        />
        {q && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl"
          )}
        >
          {isFetching && <p className="px-2 py-3 text-xs text-slate-500">Searching…</p>}
          {!isFetching && data && (
            <>
              {(data.flights?.length ?? 0) > 0 && (
                <Section title="Flights">
                  {data.flights.slice(0, 6).map((f: { id: string; callsign: string; flightNumber: string; origin: { iata: string | null }; destination: { iata: string | null } }) => (
                    <button
                      key={f.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
                      onClick={() => {
                        selectFlight(f.id);
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <Plane className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-mono">{f.flightNumber}</span>
                      <span className="text-slate-500">
                        {f.origin.iata}→{f.destination.iata}
                      </span>
                    </button>
                  ))}
                </Section>
              )}
              {(data.airports?.length ?? 0) > 0 && (
                <Section title="Airports">
                  {data.airports.slice(0, 6).map((a: SearchAirport) => (
                    <button
                      key={a.icao}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
                      onClick={() => focusAirport(a)}
                    >
                      <Building2 className="h-3.5 w-3.5 text-amber-400" />
                      <span className="font-mono">{a.iata ?? a.icao}</span>
                      <span className="truncate text-slate-400">{a.city}</span>
                    </button>
                  ))}
                </Section>
              )}
              {(data.airlines?.length ?? 0) > 0 && (
                <Section title="Airlines">
                  {data.airlines.slice(0, 4).map((a: { icao: string; name: string }) => (
                    <button
                      key={a.icao}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
                      onClick={() => {
                        useMapStore.getState().setFilters({ airline: a.icao });
                        setOpen(false);
                      }}
                    >
                      <span className="font-mono text-cyan-300">{a.icao}</span>
                      <span className="text-slate-300">{a.name}</span>
                    </button>
                  ))}
                </Section>
              )}
              {!data.flights?.length && !data.airports?.length && !data.airlines?.length && (
                <p className="px-2 py-3 text-xs text-slate-500">No matches</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}
