import { NextResponse } from "next/server";
import { getSimulator } from "@/lib/aviation-simulator";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 1000);
  const sim = getSimulator();
  const { flights } = sim.getFlights({
    type: type === "commercial" || type === "cargo" || type === "private" ? type : "all",
    limit,
  });

  const seen = new Set<string>();
  const aircraft = [];
  for (const f of flights) {
    if (seen.has(f.registration)) continue;
    seen.add(f.registration);
    aircraft.push({
      registration: f.registration,
      icao24: f.icao24,
      model: f.model,
      type: f.type,
      airline: f.airline,
      activeFlightId: f.id,
      callsign: f.callsign,
    });
    if (aircraft.length >= limit) break;
  }

  return NextResponse.json({ aircraft, total: aircraft.length });
}
