import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favourites = await prisma.favouriteAirport.findMany({
    where: { userId: session.user.id },
    include: { airport: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favourites });
}

const postSchema = z.object({
  airportCode: z.string().min(3).max(4),
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

  const code = body.data.airportCode.toUpperCase();
  const airport = await prisma.airport.findFirst({
    where: { OR: [{ icao: code }, { iata: code }] },
  });
  if (!airport) {
    return NextResponse.json({ error: "Airport not found in database" }, { status: 404 });
  }

  const fav = await prisma.favouriteAirport.upsert({
    where: {
      userId_airportId: { userId: session.user.id, airportId: airport.id },
    },
    create: { userId: session.user.id, airportId: airport.id },
    update: {},
    include: { airport: true },
  });

  return NextResponse.json({ favourite: fav });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const airportId = searchParams.get("airportId");
  if (!airportId) {
    return NextResponse.json({ error: "airportId required" }, { status: 400 });
  }
  await prisma.favouriteAirport.deleteMany({
    where: { userId: session.user.id, airportId },
  });
  return NextResponse.json({ ok: true });
}
