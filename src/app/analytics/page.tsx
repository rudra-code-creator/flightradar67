"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Plane, Activity, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StatisticsSnapshot } from "@/lib/types";

const COLORS = ["#22d3ee", "#f59e0b", "#94a3b8"];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<StatisticsSnapshot>({
    queryKey: ["statistics"],
    queryFn: async () => {
      const res = await fetch("/api/statistics");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const typeData = data
    ? [
        { name: "Commercial", value: data.byType.commercial },
        { name: "Cargo", value: data.byType.cargo },
        { name: "Private", value: data.byType.private },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.1),transparent_45%),linear-gradient(180deg,#070b14,#0b1220)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Map
            </Link>
          </Button>
        </div>

        <header className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-white">
            Traffic analytics
          </h1>
          <p className="mt-2 text-slate-400">
            Live aggregates from the aviation simulator / data adapter.
          </p>
        </header>

        {isLoading || !data ? (
          <p className="font-mono text-sm text-slate-500">Loading statistics…</p>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <Kpi
                icon={<Plane className="h-4 w-4 text-cyan-400" />}
                label="Tracked flights"
                value={data.totalFlights.toLocaleString()}
              />
              <Kpi
                icon={<Activity className="h-4 w-4 text-emerald-400" />}
                label="Airborne"
                value={data.airborne.toLocaleString()}
              />
              <Kpi
                icon={<Gauge className="h-4 w-4 text-amber-400" />}
                label="Avg altitude / speed"
                value={`${data.avgAltitude.toLocaleString()} ft · ${data.avgSpeed} kt`}
              />
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <Panel title="Fleet mix">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                        {typeData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Top airlines">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byAirline.slice(0, 8)}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="icao" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={36} />
                      <Tooltip
                        contentStyle={{
                          background: "#0f172a",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>

            <Panel title="Busiest airports">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Code</th>
                      <th className="px-2 py-2">Airport</th>
                      <th className="px-2 py-2 text-right">Arr</th>
                      <th className="px-2 py-2 text-right">Dep</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.busyAirports.map((a) => (
                      <tr key={a.code} className="border-t border-white/5">
                        <td className="px-2 py-2.5">
                          <Link href={`/airport/${a.code}`} className="font-mono text-cyan-300 hover:underline">
                            {a.code}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-slate-300">
                          {a.name}
                          <span className="text-slate-550 text-slate-500"> · {a.city}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono">{a.arrivals}</td>
                        <td className="px-2 py-2.5 text-right font-mono">{a.departures}</td>
                        <td className="px-2 py-2.5 text-right font-mono text-amber-300">
                          {a.arrivals + a.departures}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="font-mono text-xl text-white md:text-2xl">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}
