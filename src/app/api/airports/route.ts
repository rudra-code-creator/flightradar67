import { NextResponse } from "next/server";
import { listMajorAirports } from "@/lib/major-airports";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const majors = listMajorAirports().map((a) => ({
    icao: a.icao,
    iata: a.iata,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: a.lat,
    lon: a.lon,
    timezone: a.timezone as string | null,
    elevation: a.elevationFt ?? null,
    runways: a.runways ?? null,
  }));

  const byIcao = new Map(majors.map((a) => [a.icao, a]));

  try {
    const dbAirports = await prisma.airport.findMany({
      where: q
        ? {
            OR: [
              { icao: { contains: q, mode: "insensitive" } },
              { iata: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      take: 500,
    });
    for (const a of dbAirports) {
      byIcao.set(a.icao, {
        icao: a.icao,
        iata: a.iata,
        name: a.name,
        city: a.city,
        country: a.country,
        lat: a.lat,
        lon: a.lon,
        timezone: a.timezone,
        elevation: a.elevation,
        runways: (a.runways as { id: string; heading: number; lengthFt: number }[] | null) ?? null,
      });
    }
  } catch {
    /* DB optional — majors still available */
  }

  let airports = Array.from(byIcao.values());

  if (q) {
    const lower = q.toLowerCase();
    airports = airports.filter(
      (a) =>
        a.icao.toLowerCase().includes(lower) ||
        a.iata?.toLowerCase().includes(lower) ||
        a.name.toLowerCase().includes(lower) ||
        a.city.toLowerCase().includes(lower) ||
        a.country.toLowerCase().includes(lower)
    );
  }

  airports.sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({
    airports,
    source: "majors+db",
    total: airports.length,
  });
}
