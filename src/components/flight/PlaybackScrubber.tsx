"use client";

import { useMapStore } from "@/store/map-store";
import { Slider } from "@/components/ui/slider";
import type { FlightPositionSample } from "@/lib/types";

export function PlaybackScrubber({ positions }: { positions: FlightPositionSample[] }) {
  const playbackIndex = useMapStore((s) => s.playbackIndex);
  const setPlaybackIndex = useMapStore((s) => s.setPlaybackIndex);

  if (!positions.length) {
    return (
      <p className="text-xs text-slate-500">No position history yet — scrubber will populate as the simulator records tracks.</p>
    );
  }

  const idx = Math.min(playbackIndex, positions.length - 1);
  const sample = positions[idx]!;

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">Playback</p>
        <p className="font-mono text-[10px] text-slate-400">
          {new Date(sample.recordedAt).toLocaleTimeString()}
        </p>
      </div>
      <Slider
        min={0}
        max={positions.length - 1}
        step={1}
        value={[idx]}
        onValueChange={([v]) => setPlaybackIndex(v ?? 0)}
      />
      <p className="font-mono text-[11px] text-slate-400">
        {sample.lat.toFixed(3)}, {sample.lon.toFixed(3)} · {Math.round(sample.altitude)} ft ·{" "}
        {Math.round(sample.speed)} kt
      </p>
    </div>
  );
}
