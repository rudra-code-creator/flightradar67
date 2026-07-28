"use client";

import Link from "next/link";
import type { LiveFlight } from "@/lib/types";
import { formatEta } from "@/lib/utils";

export function ArrivalsDepartures({
  arrivals,
  departures,
}: {
  arrivals: LiveFlight[];
  departures: LiveFlight[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Board title="Arrivals" rows={arrivals} mode="arrival" />
      <Board title="Departures" rows={departures} mode="departure" />
    </div>
  );
}

function Board({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: LiveFlight[];
  mode: "arrival" | "departure";
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
      <header className="border-b border-white/10 px-4 py-3">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-white">{title}</h3>
        <p className="text-xs text-slate-500">{rows.length} flights in live picture</p>
      </header>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-950/95 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Flight</th>
              <th className="px-2 py-2">{mode === "arrival" ? "From" : "To"}</th>
              <th className="px-2 py-2">Airline</th>
              <th className="px-4 py-2 text-right">ETA / Prog</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <Link href={`/flight/${f.id}`} className="font-mono text-cyan-300 hover:underline">
                    {f.flightNumber}
                  </Link>
                </td>
                <td className="px-2 py-2.5 font-mono text-slate-300">
                  {mode === "arrival"
                    ? f.origin.iata ?? f.origin.icao
                    : f.destination.iata ?? f.destination.icao}
                </td>
                <td className="truncate px-2 py-2.5 text-slate-400">{f.airline?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">
                  {formatEta(f.eta)} · {Math.round(f.progress * 100)}%
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No flights
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
