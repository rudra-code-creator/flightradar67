"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrivalsDepartures } from "@/components/airport/ArrivalsDepartures";
import type { LiveFlight } from "@/lib/types";

export function AirportBoardSection({
  arrivals,
  departures,
}: {
  arrivals: LiveFlight[];
  departures: LiveFlight[];
}) {
  const [showBoard, setShowBoard] = useState(false);

  if (!showBoard) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 px-6 py-10 text-center">
        <p className="mb-4 text-sm text-slate-400">
          Arrivals and departures are hidden until you open the board.
        </p>
        <Button onClick={() => setShowBoard(true)}>
          <ClipboardList className="h-4 w-4" />
          Show arrivals / departures
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setShowBoard(false)}>
          Hide board
        </Button>
      </div>
      <ArrivalsDepartures arrivals={arrivals} departures={departures} />
    </div>
  );
}
