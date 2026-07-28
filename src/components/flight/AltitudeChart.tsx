"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FlightPositionSample } from "@/lib/types";

export function AltitudeChart({ positions }: { positions: FlightPositionSample[] }) {
  const data = positions.map((p) => ({
    t: new Date(p.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    altitude: Math.round(p.altitude),
    speed: Math.round(p.speed),
  }));

  if (!data.length) {
    return <p className="text-sm text-slate-500">Waiting for altitude samples…</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="altFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="t" stroke="#64748b" tick={{ fontSize: 10 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={48} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          />
          <Area type="monotone" dataKey="altitude" stroke="#22d3ee" fill="url(#altFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpeedChart({ positions }: { positions: FlightPositionSample[] }) {
  const data = positions.map((p) => ({
    t: new Date(p.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    speed: Math.round(p.speed),
  }));

  if (!data.length) {
    return <p className="text-sm text-slate-500">Waiting for speed samples…</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="t" stroke="#64748b" tick={{ fontSize: 10 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={40} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          />
          <Line type="monotone" dataKey="speed" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
