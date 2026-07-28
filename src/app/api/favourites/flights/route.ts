import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulator } from "@/lib/aviation-simulator";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedFlight.findMany({
    where: { userId: session.user.id },
    include: { flight: { include: { airline: true, departure: true, arrival: true, aircraft: true } } },
    orderBy: { createdAt: "desc" },
  });

  const sim = getSimulator();
  const enriched = saved.map((s) => {
    const live = sim.getFlight(s.flightId) ?? sim.getFlights({ q: s.flight.callsign, limit: 1 }).flights[0];
    return { id: s.id, flightId: s.flightId, createdAt: s.createdAt, flight: s.flight, live };
  });

  return NextResponse.json({ savedFlights: enriched });
}

const postSchema = z.object({
  flightId: z.string().min(1),
  callsign: z.string().optional(),
  flightNumber: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = postSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sim = getSimulator();
  const live = sim.getFlight(body.data.flightId);

  let flight = await prisma.flight.findUnique({ where: { id: body.data.flightId } });
  if (!flight && live) {
    flight = await prisma.flight.create({
      data: {
        id: live.id,
        callsign: live.callsign,
        flightNumber: live.flightNumber,
        status: "EN_ROUTE",
        progress: live.progress,
        distanceNm: live.distanceNm,
      },
    });
  }

  if (!flight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  }

  const saved = await prisma.savedFlight.upsert({
    where: {
      userId_flightId: { userId: session.user.id, flightId: flight.id },
    },
    create: { userId: session.user.id, flightId: flight.id },
    update: {},
  });

  return NextResponse.json({ saved });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const flightId = searchParams.get("flightId");
  if (!flightId) {
    return NextResponse.json({ error: "flightId required" }, { status: 400 });
  }
  await prisma.savedFlight.deleteMany({
    where: { userId: session.user.id, flightId },
  });
  return NextResponse.json({ ok: true });
}
