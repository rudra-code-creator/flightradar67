import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSimulator } from "@/lib/aviation-simulator";
import { AltitudeChart, SpeedChart } from "@/components/flight/AltitudeChart";
import { PlaybackScrubberClient } from "@/components/flight/PlaybackScrubberClient";
import { formatAltitude, formatSpeed } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function FlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sim = getSimulator();
  const flight = sim.getFlight(id);
  if (!flight) notFound();
  const positions = sim.getFlightHistory(id);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#122038,transparent_50%),linear-gradient(180deg,#070b14,#0b1220)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3 animate-fade-up">
          <Button asChild variant="secondary" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Map
            </Link>
          </Button>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400/80">
            Flight intelligence
          </p>
        </div>

        <header className="mb-8 animate-fade-up">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {flight.flightNumber}
          </h1>
          <p className="mt-2 text-slate-400">
            {flight.callsign} · {flight.airline?.name ?? "Private"} · {flight.model} ·{" "}
            {flight.registration}
          </p>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
          <Stat label="Altitude" value={formatAltitude(flight.altitude)} />
          <Stat label="Speed" value={formatSpeed(flight.speed)} />
          <Stat label="Heading" value={`${flight.heading}°`} />
          <Stat label="Remaining" value={`${flight.remainingNm} nm`} />
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-4 animate-fade-up">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Route</p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-white">
                <Link
                  className="text-cyan-300 hover:underline"
                  href={`/airport/${flight.origin.iata ?? flight.origin.icao}`}
                >
                  {flight.origin.iata ?? flight.origin.icao}
                </Link>
                <span className="mx-3 text-slate-600">→</span>
                <Link
                  className="text-amber-300 hover:underline"
                  href={`/airport/${flight.destination.iata ?? flight.destination.icao}`}
                >
                  {flight.destination.iata ?? flight.destination.icao}
                </Link>
              </p>
              <p className="text-sm text-slate-500">
                {flight.origin.city} to {flight.destination.city} · {flight.distanceNm} nm
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-slate-500">
                <span>{Math.round(flight.progress * 100)}%</span>
                <span>ETA {new Date(flight.eta).toUTCString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-amber-400"
                  style={{ width: `${flight.progress * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Route strip visualization */}
          <div className="relative h-28 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,#0b1730,#071018)]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 120" preserveAspectRatio="none">
              <path
                d="M40 90 C 250 20, 750 20, 960 90"
                fill="none"
                stroke="rgba(34,211,238,0.35)"
                strokeWidth="2"
              />
              <circle
                cx={40 + flight.progress * 920}
                cy={90 - Math.sin(flight.progress * Math.PI) * 55}
                r="7"
                fill="#22d3ee"
              />
            </svg>
            <div className="absolute bottom-2 left-3 font-mono text-xs text-cyan-200">
              {flight.origin.iata}
            </div>
            <div className="absolute bottom-2 right-3 font-mono text-xs text-amber-200">
              {flight.destination.iata}
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2 animate-fade-up">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Altitude profile
            </h2>
            <AltitudeChart positions={positions} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Ground speed
            </h2>
            <SpeedChart positions={positions} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 animate-fade-up">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Position playback
          </h2>
          <PlaybackScrubberClient positions={positions} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-mono text-xl text-white">{value}</p>
    </div>
  );
}
