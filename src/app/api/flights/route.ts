import { NextResponse } from "next/server";
import { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/redis";
import { getLiveFlights } from "@/lib/opensky";

const querySchema = z.object({
  west: z.coerce.number().optional(),
  south: z.coerce.number().optional(),
  east: z.coerce.number().optional(),
  north: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  airline: z.string().optional(),
  type: z.enum(["commercial", "cargo", "private", "all"]).optional(),
  minAltitude: z.coerce.number().optional(),
  maxAltitude: z.coerce.number().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const filters = parsed.data;
  const cacheKey = `flights:v2:${JSON.stringify(filters)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: { "X-Cache": "HIT" },
    });
  }

  const result = await getLiveFlights(filters);
  const payload = {
    ...result,
    updatedAt: Date.now(),
  };
  await cacheSet(cacheKey, JSON.stringify(payload), 2);
  return NextResponse.json(payload, { headers: { "X-Cache": "MISS" } });
}
