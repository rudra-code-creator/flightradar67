import { NextResponse } from "next/server";
import { getLiveTraffic } from "@/lib/live-traffic";
import { getSimulator } from "@/lib/aviation-simulator";
import { enrichFlightWithRoute } from "@/lib/flight-route";
import { fetchAdsbLolTrack, mergeTracks } from "@/lib/flight-track";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const hub = getLiveTraffic();
  hub.start();

  let flight = hub.getFlight(id);
  let liveTrail = hub.getTrail(id);
  let trackSource: "adsb_trace" | "hub" | "simulator" = "hub";

  if (!flight) {
    const sim = getSimulator();
    flight = sim.getFlight(id);
    if (flight) {
      liveTrail = sim.getFlightHistory(id);
      trackSource = "simulator";
    }
  }

  if (!flight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  }

  const enriched = await enrichFlightWithRoute(flight);
  const originHint =
    enriched.origin?.icao && enriched.origin.icao !== "ZZZZ"
      ? {
          lat: enriched.origin.lat,
          lon: enriched.origin.lon,
          icao: enriched.origin.icao,
        }
      : undefined;

  const historical = enriched.icao24
    ? await fetchAdsbLolTrack(enriched.icao24, originHint)
    : [];

  let positions = liveTrail;
  if (historical.length >= 2) {
    positions = mergeTracks(historical, liveTrail);
    trackSource = "adsb_trace";
  } else if (liveTrail.length >= 2) {
    positions = liveTrail;
  }

  return NextResponse.json({
    flight: enriched,
    positions,
    trackSource,
    source: hub.getFlights({ limit: 1 }).source,
  });
}
