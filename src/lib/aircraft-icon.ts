import { altitudeColorHex } from "./altitude-color";

const cache = new Map<string, string>();

/** Plane silhouette data-URL, colored by altitude, rotated by heading. */
export function getAircraftIconDataUrl(altitudeFt: number, headingDeg: number): string {
  const bucket = Math.round(((headingDeg % 360) + 360) % 360 / 5) * 5;
  const altBucket = Math.round(altitudeFt / 500) * 500;
  const key = `${altBucket}:${bucket}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const color = altitudeColorHex(altitudeFt);

  ctx.translate(size / 2, size / 2);
  ctx.rotate((bucket * Math.PI) / 180);

  // Soft glow
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fillStyle = `${color}33`;
  ctx.fill();

  // Plane body (nose up = north / 0°)
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(4, -6);
  ctx.lineTo(16, 2);
  ctx.lineTo(16, 6);
  ctx.lineTo(4, 2);
  ctx.lineTo(3, 12);
  ctx.lineTo(8, 16);
  ctx.lineTo(8, 18);
  ctx.lineTo(0, 14);
  ctx.lineTo(-8, 18);
  ctx.lineTo(-8, 16);
  ctx.lineTo(-3, 12);
  ctx.lineTo(-4, 2);
  ctx.lineTo(-16, 6);
  ctx.lineTo(-16, 2);
  ctx.lineTo(-4, -6);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.stroke();

  // Cockpit highlight
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(2, -8);
  ctx.lineTo(-2, -8);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  if (cache.size > 800) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  return url;
}
