"use client";

/**
 * Thin wrapper documenting aircraft entity metadata for the Cesium layer.
 * Rendering is handled in CesiumFlightMap via EntityCollection / billboards
 * for performance with thousands of markers.
 */
export interface AircraftEntityProps {
  id: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  heading: number;
  callsign: string;
  selected?: boolean;
}

export function aircraftEntityDescription(props: AircraftEntityProps) {
  return `${props.callsign} · ${Math.round(props.altitudeFt)} ft · hdg ${Math.round(props.heading)}`;
}
