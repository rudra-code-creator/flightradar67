import { NextResponse } from "next/server";
import { getSimulator } from "@/lib/aviation-simulator";
import { findMajorAirport } from "@/lib/major-airports";
import { prisma } from "@/lib/prisma";

async function fetchWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&wind_speed_unit=kt`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.current ?? null;
  } catch {
    return {
      temperature_2m: 18,
      wind_speed_10m: 12,
      wind_direction_10m: 180,
      weather_code: 1,
      relative_humidity_2m: 55,
      mock: true,
    };
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const upper = code.toUpperCase();
  const sim = getSimulator();
  const board = sim.getAirportBoard(upper);
  const major = findMajorAirport(upper);

  let dbAirport = null;
  try {
    dbAirport = await prisma.airport.findFirst({
      where: {
        OR: [{ icao: upper }, { iata: upper }],
      },
    });
  } catch {
    /* ignore */
  }

  if (!board && !dbAirport && !major) {
    return NextResponse.json({ error: "Airport not found" }, { status: 404 });
  }

  const airport = dbAirport
    ? {
        icao: dbAirport.icao,
        iata: dbAirport.iata,
        name: dbAirport.name,
        city: dbAirport.city,
        country: dbAirport.country,
        lat: dbAirport.lat,
        lon: dbAirport.lon,
        timezone: dbAirport.timezone,
        elevation: dbAirport.elevation,
        runways: dbAirport.runways,
      }
    : major
      ? {
          icao: major.icao,
          iata: major.iata,
          name: major.name,
          city: major.city,
          country: major.country,
          lat: major.lat,
          lon: major.lon,
          timezone: major.timezone,
          elevation: major.elevationFt ?? null,
          runways: major.runways ?? null,
        }
      : {
          icao: board!.airport.icao,
          iata: board!.airport.iata,
          name: board!.airport.name,
          city: board!.airport.city,
          country: board!.airport.country,
          lat: board!.airport.lat,
          lon: board!.airport.lon,
          timezone: board!.airport.timezone ?? null,
          elevation: null as number | null,
          runways: null,
        };

  const weather = await fetchWeather(airport.lat, airport.lon);

  return NextResponse.json({
    airport,
    arrivals: board?.arrivals ?? [],
    departures: board?.departures ?? [],
    weather,
  });
}
