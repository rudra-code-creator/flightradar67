"use client";

import { ALTITUDE_LEGEND } from "@/lib/altitude-color";

export function AltitudeLegend() {
  return (
    <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 sm:bottom-5">
      <div className="rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur-xl">
        <p className="mb-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-slate-400">
          Altitude (ft)
        </p>
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${ALTITUDE_LEGEND.map((s) => s.color).join(", ")})`,
          }}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
          {ALTITUDE_LEGEND.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
