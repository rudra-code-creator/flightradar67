import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { getSimulator } from "@/lib/aviation-simulator";

export async function GET() {
  const cacheKey = "statistics:v1";
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
  }
  const stats = getSimulator().getStatistics();
  await cacheSet(cacheKey, JSON.stringify(stats), 5);
  return NextResponse.json(stats, { headers: { "X-Cache": "MISS" } });
}
