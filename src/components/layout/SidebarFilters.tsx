"use client";

import { useMapStore } from "@/store/map-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Crosshair, Layers } from "lucide-react";

export function SidebarFilters() {
  const open = useMapStore((s) => s.sidebarOpen);
  const filters = useMapStore((s) => s.filters);
  const setFilters = useMapStore((s) => s.setFilters);
  const setFollowSelected = useMapStore((s) => s.setFollowSelected);
  const followSelected = useMapStore((s) => s.followSelected);
  const setPlaybackMode = useMapStore((s) => s.setPlaybackMode);
  const playbackMode = useMapStore((s) => s.playbackMode);

  return (
    <aside
      className={cn(
        "pointer-events-auto absolute left-3 top-20 z-20 w-[min(100%-1.5rem,300px)] transition-all duration-300 md:top-24",
        open ? "translate-x-0 opacity-100" : "-translate-x-[120%] opacity-0"
      )}
    >
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide">
            Filters & Layers
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Airline</Label>
            <Input
              placeholder="QF, Emirates…"
              value={filters.airline}
              onChange={(e) => setFilters({ airline: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Aircraft type</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["all", "commercial", "cargo", "private"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={filters.type === t ? "default" : "secondary"}
                  onClick={() => setFilters({ type: t })}
                  className="capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Altitude band</Label>
              <span className="font-mono text-[10px] text-slate-400">
                {filters.minAltitude.toLocaleString()}–{filters.maxAltitude.toLocaleString()} ft
              </span>
            </div>
            <Slider
              min={0}
              max={50000}
              step={1000}
              value={[filters.minAltitude, filters.maxAltitude]}
              onValueChange={(vals) => {
                if (vals.length < 2) return;
                const min = Math.min(vals[0] ?? 0, vals[1] ?? 50000);
                const max = Math.max(vals[0] ?? 0, vals[1] ?? 50000);
                setFilters({ minAltitude: min, maxAltitude: max });
              }}
            />
          </div>

          <div className="space-y-3 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="airports">Airport markers</Label>
              <Switch
                id="airports"
                checked={filters.showAirports}
                onCheckedChange={(v) => setFilters({ showAirports: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="labels">Callsign labels</Label>
              <Switch
                id="labels"
                checked={filters.showLabels}
                onCheckedChange={(v) => setFilters({ showLabels: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="cluster">Downsample when zoomed out</Label>
              <Switch
                id="cluster"
                checked={filters.clusterWhenZoomedOut}
                onCheckedChange={(v) => setFilters({ clusterWhenZoomedOut: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="weather">Weather tint (stub)</Label>
              <Switch
                id="weather"
                checked={filters.showWeather}
                onCheckedChange={(v) => setFilters({ showWeather: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="follow">Follow selected</Label>
              <Switch id="follow" checked={followSelected} onCheckedChange={setFollowSelected} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="playback">Playback scrubber</Label>
              <Switch id="playback" checked={playbackMode} onCheckedChange={setPlaybackMode} />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(() => {
                /* Cesium fly handled via follow / future hook — store flag */
                setFollowSelected(false);
              });
            }}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Geolocate (browser)
          </Button>
        </div>
      </div>
    </aside>
  );
}
