import { getLiveTraffic } from "@/lib/live-traffic";
import type { LiveFlight } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function compact(flights: LiveFlight[]) {
  return flights.map((f) => ({
    id: f.id,
    lat: Number(f.lat.toFixed(5)),
    lon: Number(f.lon.toFixed(5)),
    alt: f.altitude,
    hdg: f.heading,
    spd: f.speed,
    vs: f.verticalSpeed,
    prog: Number(f.progress.toFixed(4)),
    st: f.status,
    callsign: f.callsign,
    model: f.model,
    type: f.type,
    reg: f.registration,
  }));
}

export async function GET() {
  const hub = getLiveTraffic();
  hub.start();
  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const { flights, source } = hub.getFlights({ limit: 8000 });
      send("snapshot", { flights: compact(flights), ts: Date.now(), source });

      let lastSent = 0;
      unsubscribe = hub.subscribe((all) => {
        const now = Date.now();
        if (now - lastSent < 2000) return;
        lastSent = now;
        send("update", {
          flights: compact(all),
          ts: now,
          source: hub.getFlights({ limit: 1 }).source,
        });
      });

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 15000);

      if (typeof heartbeat === "object" && "unref" in heartbeat) {
        (heartbeat as NodeJS.Timeout).unref?.();
      }
    },
    cancel() {
      closed = true;
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
