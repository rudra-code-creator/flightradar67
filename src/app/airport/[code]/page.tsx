import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CloudSun, Ruler } from "lucide-react";
import { getSimulator } from "@/lib/aviation-simulator";
import { findMajorAirport } from "@/lib/major-airports";
import { prisma } from "@/lib/prisma";
import { AirportBoardSection } from "@/components/airport/AirportBoardSection";
import { Button } from "@/components/ui/button";
import { FavouriteAirportButton } from "@/components/airport/FavouriteAirportButton";

async function getWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&wind_speed_unit=kt`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error("weather");
    const data = await res.json();
    return data.current as {
      temperature_2m: number;
      wind_speed_10m: number;
      wind_direction_10m: number;
      weather_code: number;
    };
  } catch {
    return {
      temperature_2m: 17,
      wind_speed_10m: 10,
      wind_direction_10m: 220,
      weather_code: 1,
    };
  }
}

export default async function AirportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const sim = getSimulator();
  const board = sim.getAirportBoard(upper);
  const major = findMajorAirport(upper);

  let dbAirport = null;
  try {
    dbAirport = await prisma.airport.findFirst({
      where: { OR: [{ icao: upper }, { iata: upper }] },
    });
  } catch {
    /* db optional */
  }

  if (!board && !dbAirport && !major) notFound();

  const airport = dbAirport
    ? {
        id: dbAirport.id,
        icao: dbAirport.icao,
        iata: dbAirport.iata,
        name: dbAirport.name,
        city: dbAirport.city,
        country: dbAirport.country,
        lat: dbAirport.lat,
        lon: dbAirport.lon,
        timezone: dbAirport.timezone,
        elevation: dbAirport.elevation,
        runways: (dbAirport.runways as { id: string; heading: number; lengthFt: number }[] | null) ?? [],
      }
    : major
      ? {
          id: major.icao,
          icao: major.icao,
          iata: major.iata,
          name: major.name,
          city: major.city,
          country: major.country,
          lat: major.lat,
          lon: major.lon,
          timezone: major.timezone,
          elevation: major.elevationFt ?? null,
          runways: major.runways ?? [],
        }
      : {
          id: board!.airport.icao,
          ...board!.airport,
          elevation: null as number | null,
          runways: [] as { id: string; heading: number; lengthFt: number }[],
        };

  const weather = await getWeather(airport.lat, airport.lon);
  const arrivals = board?.arrivals ?? [];
  const departures = board?.departures ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_40%),linear-gradient(180deg,#070b14,#0b1220)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Map
            </Link>
          </Button>
          <FavouriteAirportButton code={airport.iata ?? airport.icao} />
        </div>

        <header className="mb-8 animate-fade-up">
          <p className="font-mono text-sm text-amber-300">{airport.iata ?? airport.icao}</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-white md:text-5xl">
            {airport.name}
          </h1>
          <p className="mt-2 text-slate-400">
            {airport.city}, {airport.country} · {airport.icao}
            {airport.timezone ? ` · ${airport.timezone}` : ""}
          </p>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3 animate-fade-up">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="mb-2 flex items-center gap-2 text-cyan-300">
              <CloudSun className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Weather</span>
            </div>
            <p className="font-mono text-3xl text-white">{Math.round(weather.temperature_2m)}°C</p>
            <p className="mt-1 text-sm text-slate-400">
              Wind {Math.round(weather.wind_speed_10m)} kt / {weather.wind_direction_10m}°
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 md:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-amber-300">
              <Ruler className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Runways</span>
            </div>
            {airport.runways?.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {airport.runways.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm"
                  >
                    {r.id} · hdg {r.heading} · {r.lengthFt.toLocaleString()} ft
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                Runway data available after database seed.
              </p>
            )}
          </div>
        </div>

        <AirportBoardSection arrivals={arrivals} departures={departures} />
      </div>
    </div>
  );
}
