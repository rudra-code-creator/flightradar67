import { NextResponse } from "next/server";
import { getSimulator } from "@/lib/aviation-simulator";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ flights: [], airports: [], airlines: [] });
  }

  const sim = getSimulator();
  const results = sim.search(q, 15);

  const session = await auth();
  if (session?.user?.id) {
    try {
      await prisma.searchHistory.create({
        data: { userId: session.user.id, query: q },
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json(results);
}
