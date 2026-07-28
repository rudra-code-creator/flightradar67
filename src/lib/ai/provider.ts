import { getSimulator } from "../aviation-simulator";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatContext {
  selectedFlightId?: string | null;
}

function toolAnswer(query: string, context: ChatContext): string {
  const sim = getSimulator();
  const q = query.toLowerCase();
  const stats = sim.getStatistics();

  if (context.selectedFlightId) {
    const f = sim.getFlight(context.selectedFlightId);
    if (f && (q.includes("this flight") || q.includes("selected") || q.includes("current"))) {
      return `${f.flightNumber} (${f.callsign}) is a ${f.model} operated by ${f.airline?.name ?? "private"} from ${f.origin.iata ?? f.origin.icao} to ${f.destination.iata ?? f.destination.icao}. Altitude ${f.altitude.toLocaleString()} ft, ${f.speed} kt, heading ${f.heading}°. Progress ${(f.progress * 100).toFixed(0)}%, ETA ${new Date(f.eta).toUTCString()}.`;
    }
  }

  if (q.includes("busiest") || q.includes("busy airport")) {
    const top = stats.busyAirports.slice(0, 5);
    return `Busiest hubs right now: ${top.map((a) => `${a.code} (${a.arrivals + a.departures} movements)`).join(", ")}.`;
  }

  if (q.includes("airline") && (q.includes("most") || q.includes("top") || q.includes("which"))) {
    const top = stats.byAirline.slice(0, 5);
    return `Top airlines by airborne count: ${top.map((a) => `${a.name} (${a.count})`).join(", ")}.`;
  }

  if (q.includes("how many") || q.includes("count") || q.includes("traffic")) {
    return `Tracking ${stats.totalFlights.toLocaleString()} flights (${stats.airborne.toLocaleString()} airborne). Mix: ${stats.byType.commercial} commercial, ${stats.byType.cargo} cargo, ${stats.byType.private} private. Avg altitude ${stats.avgAltitude.toLocaleString()} ft, avg speed ${stats.avgSpeed} kt.`;
  }

  const routeMatch = q.match(/\b([a-z]{3})\s*(?:to|->|→)\s*([a-z]{3})\b/i);
  if (routeMatch) {
    const [, a, b] = routeMatch;
    const { flights } = sim.getFlights({ limit: 20000 });
    const matches = flights.filter(
      (f) =>
        (f.origin.iata?.toLowerCase() === a!.toLowerCase() ||
          f.origin.icao.toLowerCase() === a!.toLowerCase()) &&
        (f.destination.iata?.toLowerCase() === b!.toLowerCase() ||
          f.destination.icao.toLowerCase() === b!.toLowerCase())
    );
    if (!matches.length) return `No live flights found on ${a!.toUpperCase()} → ${b!.toUpperCase()}.`;
    return `${matches.length} flight(s) on ${a!.toUpperCase()} → ${b!.toUpperCase()}: ${matches
      .slice(0, 5)
      .map((f) => `${f.flightNumber} (${Math.round(f.progress * 100)}%)`)
      .join(", ")}.`;
  }

  const airportMatch = q.match(/\b([A-Z]{3,4})\b/);
  if (airportMatch && (q.includes("airport") || q.includes("arrivals") || q.includes("departures"))) {
    const board = sim.getAirportBoard(airportMatch[1]!);
    if (board) {
      return `${board.airport.name} (${board.airport.iata ?? board.airport.icao}): ${board.arrivals.length} inbound, ${board.departures.length} outbound in the live picture. Nearest arrival: ${board.arrivals[0]?.flightNumber ?? "n/a"}.`;
    }
  }

  return `I'm RadarAI. Live sky: ${stats.airborne.toLocaleString()} airborne of ${stats.totalFlights.toLocaleString()} tracked. Ask about busy airports, top airlines, a route like SYD to SIN, or select a flight for details.`;
}

export async function chatWithRadarAI(
  messages: ChatMessage[],
  context: ChatContext = {}
): Promise<string> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const fallback = toolAnswer(lastUser?.content ?? "", context);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const system: ChatMessage = {
    role: "system",
    content: `You are RadarAI, the FlightRadar67 aviation assistant. Be concise and factual. Live context: ${fallback}`,
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [system, ...messages.filter((m) => m.role !== "system")],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}
