"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Plane, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const flightsQ = useQuery({
    queryKey: ["saved-flights"],
    queryFn: async () => {
      const res = await fetch("/api/favourites/flights");
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const airportsQ = useQuery({
    queryKey: ["fav-airports"],
    queryFn: async () => {
      const res = await fetch("/api/favourites/airports");
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: status === "authenticated",
  });

  const removeFlight = useMutation({
    mutationFn: async (flightId: string) => {
      await fetch(`/api/favourites/flights?flightId=${encodeURIComponent(flightId)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-flights"] }),
  });

  const removeAirport = useMutation({
    mutationFn: async (airportId: string) => {
      await fetch(`/api/favourites/airports?airportId=${encodeURIComponent(airportId)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav-airports"] }),
  });

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-slate-400">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070b14,#0b1220)]">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <Button asChild variant="secondary" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Map
            </Link>
          </Button>
        </div>

        <header className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
            {session?.user?.name ?? "Pilot profile"}
          </h1>
          <p className="text-slate-400">{session?.user?.email}</p>
        </header>

        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Plane className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Saved flights
            </h2>
          </div>
          <ul className="space-y-2">
            {(flightsQ.data?.savedFlights ?? []).map(
              (s: {
                id: string;
                flightId: string;
                flight: { callsign: string; flightNumber: string | null };
                live?: { flightNumber: string; origin: { iata: string | null }; destination: { iata: string | null } };
              }) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <Link href={`/flight/${s.flightId}`} className="min-w-0 hover:underline">
                    <p className="font-mono text-cyan-300">
                      {s.live?.flightNumber ?? s.flight.flightNumber ?? s.flight.callsign}
                    </p>
                    {s.live && (
                      <p className="truncate text-xs text-slate-500">
                        {s.live.origin.iata} → {s.live.destination.iata}
                      </p>
                    )}
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFlight.mutate(s.flightId)}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </li>
              )
            )}
            {!flightsQ.data?.savedFlights?.length && (
              <p className="text-sm text-slate-500">No saved flights yet — pick one on the map.</p>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Favourite airports
            </h2>
          </div>
          <ul className="space-y-2">
            {(airportsQ.data?.favourites ?? []).map(
              (f: {
                id: string;
                airportId: string;
                airport: { iata: string | null; icao: string; name: string; city: string };
              }) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <Link
                    href={`/airport/${f.airport.iata ?? f.airport.icao}`}
                    className="hover:underline"
                  >
                    <p className="font-mono text-amber-300">
                      {f.airport.iata ?? f.airport.icao}
                    </p>
                    <p className="text-xs text-slate-500">
                      {f.airport.name} · {f.airport.city}
                    </p>
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAirport.mutate(f.airportId)}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </li>
              )
            )}
            {!airportsQ.data?.favourites?.length && (
              <p className="text-sm text-slate-500">No favourites yet.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
