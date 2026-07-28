import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAltitude(ft: number) {
  if (ft >= 1000) return `FL${Math.round(ft / 100)}`;
  return `${Math.round(ft)} ft`;
}

export function formatSpeed(kt: number) {
  return `${Math.round(kt)} kt`;
}

export function formatEta(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}
