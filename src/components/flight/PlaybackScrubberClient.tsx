"use client";

import { PlaybackScrubber } from "@/components/flight/PlaybackScrubber";
import type { FlightPositionSample } from "@/lib/types";
import { useMapStore } from "@/store/map-store";
import { useEffect } from "react";

export function PlaybackScrubberClient({ positions }: { positions: FlightPositionSample[] }) {
  const setPlaybackMode = useMapStore((s) => s.setPlaybackMode);
  useEffect(() => {
    setPlaybackMode(true);
  }, [setPlaybackMode]);
  return <PlaybackScrubber positions={positions} />;
}
