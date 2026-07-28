/** ADSB.lol-style altitude → color mapping (feet). */

export function altitudeColorHex(altFt: number): string {
  const a = Number.isFinite(altFt) ? altFt : 0;
  if (a < 500) return "#7dd3fc"; // ground / taxi
  if (a < 1500) return "#22d3ee";
  if (a < 3000) return "#4ade80";
  if (a < 5000) return "#86efac";
  if (a < 8000) return "#a3e635";
  if (a < 12000) return "#facc15";
  if (a < 20000) return "#fb923c";
  if (a < 30000) return "#f43f5e";
  if (a < 40000) return "#e879f9";
  return "#818cf8";
}

export const ALTITUDE_LEGEND: { ft: number; color: string; label: string }[] = [
  { ft: 0, color: "#7dd3fc", label: "0" },
  { ft: 1500, color: "#22d3ee", label: "1.5k" },
  { ft: 5000, color: "#86efac", label: "5k" },
  { ft: 10000, color: "#facc15", label: "10k" },
  { ft: 20000, color: "#fb923c", label: "20k" },
  { ft: 30000, color: "#f43f5e", label: "30k" },
  { ft: 40000, color: "#e879f9", label: "40k+" },
];
