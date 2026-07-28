const cache = new Map<string, string>();

/** Amber map-pin data URL for major airport markers (client-only). */
export function getAirportPinDataUrl(selected = false): string {
  const key = selected ? "sel" : "std";
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const fill = selected ? "#f59e0b" : "#fbbf24";
  const stroke = "#0f172a";

  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, 4);

  // Pin teardrop
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.bezierCurveTo(-18, 22, -16, 6, 0, 6);
  ctx.bezierCurveTo(16, 6, 18, 22, 0, 36);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  // Inner hole
  ctx.beginPath();
  ctx.arc(0, 14, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 14, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();

  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
