"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AirportRef, FlightPositionSample, LiveFlight } from "@/lib/types";
import { getAircraftIconDataUrl } from "@/lib/aircraft-icon";
import { getAirportPinDataUrl } from "@/lib/airport-pin-icon";
import { altitudeColorHex } from "@/lib/altitude-color";
import { cruiseAltitudeProfile, sampleGreatCircle } from "@/lib/geo";
import {
  getClientTrail,
  getLivePosition,
  subscribeLivePositions,
  tickLivePositions,
} from "@/lib/live-positions";
import { useMapStore } from "@/store/map-store";

const MAX_VISIBLE = 1500;
const LABEL_MAX = 50;
const HEADING_BUCKET = 8;
const ALT_BUCKET = 500;
/** Keep icons briefly if a poll misses them — NOT for out-of-viewport aircraft */
const ENTITY_GRACE_MS = 12_000;
const ROUTE_SAMPLES = 48;

type RouteEnds = { origin: AirportRef; destination: AirportRef };

type CesiumModule = typeof import("cesium");

function applyFilters(flights: LiveFlight[]) {
  const { filters } = useMapStore.getState();
  return flights.filter((f) => {
    if (filters.type !== "all" && f.type !== filters.type) return false;
    if (filters.airline) {
      const q = filters.airline.toLowerCase();
      const match =
        f.airline?.icao.toLowerCase() === q ||
        f.airline?.iata?.toLowerCase() === q ||
        f.airline?.name.toLowerCase().includes(q) ||
        f.callsign.toLowerCase().includes(q);
      if (!match) return false;
    }
    const minA = Number.isFinite(filters.minAltitude) ? filters.minAltitude : 0;
    const maxA = Number.isFinite(filters.maxAltitude) ? filters.maxAltitude : 50000;
    if (maxA - minA >= 1000 && (f.altitude < minA || f.altitude > maxA)) return false;
    return true;
  });
}

function pickVisible(flights: LiveFlight[], max: number): LiveFlight[] {
  if (flights.length <= max) return flights;
  const scored = flights.map((f) => {
    let h = 0;
    for (let i = 0; i < f.id.length; i++) h = (h * 31 + f.id.charCodeAt(i)) >>> 0;
    return { f, h };
  });
  scored.sort((a, b) => a.h - b.h);
  return scored.slice(0, max).map((s) => s.f);
}

export default function CesiumFlightMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const entitiesRef = useRef<Map<string, import("cesium").Entity>>(new Map());
  const iconKeyRef = useRef<Map<string, string>>(new Map());
  const lastSeenRef = useRef<Map<string, number>>(new Map());
  const flownPathRef = useRef<import("cesium").Entity | null>(null);
  const remainPathRef = useRef<import("cesium").Entity | null>(null);
  const routeMarkerRefs = useRef<import("cesium").Entity[]>([]);
  const airportEntitiesRef = useRef<import("cesium").Entity[]>([]);
  const airportMetaRef = useRef<Map<string, AirportRef>>(new Map());
  const routeEndsRef = useRef<RouteEnds | null>(null);
  const realTrackRef = useRef<FlightPositionSample[]>([]);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const metaRef = useRef<Map<string, LiveFlight>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flights = useMapStore((s) => s.flights);
  const selectedFlightId = useMapStore((s) => s.selectedFlightId);
  const selectedAirport = useMapStore((s) => s.selectedAirport);
  const cameraFlyTo = useMapStore((s) => s.cameraFlyTo);
  const filters = useMapStore((s) => s.filters);
  const followSelected = useMapStore((s) => s.followSelected);
  const selectFlight = useMapStore((s) => s.selectFlight);
  const selectAirport = useMapStore((s) => s.selectAirport);
  const setViewport = useMapStore((s) => s.setViewport);
  const viewport = useMapStore((s) => s.viewport);

  const filteredMeta = useMemo(
    () => applyFilters(flights),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flights, filters.airline, filters.type, filters.minAltitude, filters.maxAltitude]
  );

  useEffect(() => {
    const m = new Map<string, LiveFlight>();
    for (const f of filteredMeta) m.set(f.id, f);
    metaRef.current = m;
  }, [filteredMeta]);

  useEffect(() => {
    let destroyed = false;
    let viewer: import("cesium").Viewer | null = null;
    const entities = entitiesRef.current;
    const lastSeen = lastSeenRef.current;

    async function init() {
      if (!containerRef.current) return;
      try {
        (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        const Cesium = await import("cesium");
        if (destroyed) return;
        cesiumRef.current = Cesium;

        if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        }

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: true,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement("div"),
          terrain: undefined,
        });

        if (destroyed) {
          viewer.destroy();
          viewer = null;
          return;
        }

        if (!process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
          viewer.imageryLayers.removeAll();
          viewer.imageryLayers.addImageryProvider(
            new Cesium.UrlTemplateImageryProvider({
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              credit: "© OpenStreetMap contributors",
            })
          );
        }

        viewer.scene.globe.enableLighting = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.clock.shouldAnimate = true;
        // Continuous frames so CallbackProperty positions advance every tick
        viewer.scene.requestRenderMode = false;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(153.12, -27.4, 1_200_000),
        });

        const publishViewport = () => {
          const carto = viewer!.camera.positionCartographic;
          if (!carto) return;
          const lat = (carto.latitude * 180) / Math.PI;
          const lon = (carto.longitude * 180) / Math.PI;
          const heightKm = carto.height / 1000;
          let radiusNm = 80;
          if (heightKm > 200) radiusNm = 120;
          if (heightKm > 500) radiusNm = 180;
          if (heightKm > 1200) radiusNm = 220;
          if (heightKm > 3000) radiusNm = 250;
          setViewport({ lat, lon, radiusNm });
        };
        publishViewport();
        viewer.camera.percentageChanged = 0.12;
        let vpTimer: ReturnType<typeof setTimeout> | null = null;
        viewer.camera.changed.addEventListener(() => {
          if (vpTimer) clearTimeout(vpTimer);
          vpTimer = setTimeout(publishViewport, 280);
        });

        // Correct globe occlusion — hide anything the Earth blocks (antipodes)
        const earthSphere = new Cesium.BoundingSphere(
          Cesium.Cartesian3.ZERO,
          viewer.scene.globe.ellipsoid.maximumRadius
        );
        const occluder = new Cesium.Occluder(earthSphere, viewer.camera.positionWC);
        viewer.scene.preRender.addEventListener(() => {
          tickLivePositions();
          occluder.cameraPosition = viewer!.camera.positionWC;
          const hideIfOccluded = (entity: import("cesium").Entity) => {
            const pos = entity.position?.getValue(viewer!.clock.currentTime);
            if (!pos) {
              entity.show = false;
              return;
            }
            entity.show = occluder.isPointVisible(pos);
          };
          for (const entity of entitiesRef.current.values()) hideIfOccluded(entity);
          for (const entity of airportEntitiesRef.current) hideIfOccluded(entity);
          for (const entity of routeMarkerRefs.current) hideIfOccluded(entity);
        });

        viewer.screenSpaceEventHandler.setInputAction(
          (movement: { position: import("cesium").Cartesian2 }) => {
            const picked = viewer!.scene.pick(movement.position);
            if (Cesium.defined(picked) && picked.id?.id) {
              const id = String(picked.id.id);
              if (id.startsWith("flight-")) {
                selectFlight(id.replace("flight-", ""));
              } else if (id.startsWith("airport-")) {
                const icao = id.replace("airport-", "");
                const cached = airportMetaRef.current.get(icao);
                if (cached) selectAirport(cached);
                void fetch(`/api/airports/${encodeURIComponent(icao)}`)
                  .then((r) => (r.ok ? r.json() : null))
                  .then((json) => {
                    if (!json?.airport) return;
                    selectAirport(json.airport);
                  });
              }
            }
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        );

        viewerRef.current = viewer;
        setReady(true);
      } catch (e) {
        console.error(e);
        if (!destroyed) setError((e as Error).message ?? "Failed to load map");
      }
    }

    init();

    return () => {
      destroyed = true;
      if (viewer) {
        try {
          viewer.destroy();
        } catch {
          /* ignore */
        }
        if (viewerRef.current === viewer) viewerRef.current = null;
      }
      entities.clear();
      lastSeen.clear();
      setReady(false);
    };
  }, [selectFlight, selectAirport, setViewport]);

  // Major airport pin markers
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready) return;

    for (const e of airportEntitiesRef.current) viewer.entities.remove(e);
    airportEntitiesRef.current = [];
    airportMetaRef.current.clear();
    if (!filters.showAirports) return;

    const pinImage = getAirportPinDataUrl(false);
    let cancelled = false;
    fetch("/api/airports")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || viewerRef.current !== viewer) return;
        const list = data.airports ?? [];
        for (const a of list) {
          if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
          const meta: AirportRef = {
            icao: a.icao,
            iata: a.iata ?? null,
            name: a.name,
            city: a.city,
            country: a.country,
            lat: a.lat,
            lon: a.lon,
            timezone: a.timezone ?? null,
          };
          airportMetaRef.current.set(a.icao, meta);
          // Lift off the ellipsoid so depth-test / terrain clamp cannot bury the pin,
          // and ConstantPositionProperty always resolves for the occluder.
          const heightM = 2_500;
          airportEntitiesRef.current.push(
            viewer.entities.add({
              id: `airport-${a.icao}`,
              position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat, heightM),
              billboard: {
                image: pinImage,
                width: 32,
                height: 32,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(2.0e5, 1.25, 1.2e7, 0.4),
              },
              point: {
                pixelSize: 8,
                color: Cesium.Color.fromCssColorString("#fbbf24"),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(2.0e5, 1.2, 1.2e7, 0.35),
              },
              label: {
                text: a.iata ?? a.icao,
                font: "bold 12px JetBrains Mono, monospace",
                fillColor: Cesium.Color.fromCssColorString("#fde68a"),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -34),
                heightReference: Cesium.HeightReference.NONE,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                show: true,
                scaleByDistance: new Cesium.NearFarScalar(2.0e5, 1.05, 1.0e7, 0.3),
              },
            })
          );
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [ready, filters.showAirports]);

  // Create / soft-prune aircraft entities (never teleport or recreate on poll)
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready) return;

    const vp = useMapStore.getState().viewport;
    const cosLat = Math.max(0.2, Math.cos((vp.lat * Math.PI) / 180));
    const maxNm = vp.radiusNm * 1.35;
    const nearViewport = (lat: number, lon: number) => {
      const dLat = Math.abs(lat - vp.lat);
      const dLon = Math.abs((((lon - vp.lon + 540) % 360) - 180));
      return Math.sqrt((dLat * 60) ** 2 + (dLon * 60 * cosLat) ** 2) <= maxNm;
    };

    const visible = pickVisible(
      filteredMeta.filter((f) => {
        const live = getLivePosition(f.id);
        return nearViewport(live?.lat ?? f.lat, live?.lon ?? f.lon);
      }),
      MAX_VISIBLE
    );
    const now = Date.now();
    let labelBudget = filters.showLabels ? LABEL_MAX : 0;

    for (const f of visible) {
      lastSeenRef.current.set(f.id, now);
      let entity = entitiesRef.current.get(f.id);
      const live = getLivePosition(f.id);
      const lat = live?.lat ?? f.lat;
      const lon = live?.lon ?? f.lon;
      const alt = live?.alt ?? f.altitude;
      const hdg = live?.hdg ?? f.heading;
      const selected = selectedFlightId === f.id;
      const iconKey = `${Math.round(alt / ALT_BUCKET) * ALT_BUCKET}:${Math.round(hdg / HEADING_BUCKET) * HEADING_BUCKET}`;

      if (!entity) {
        const flightId = f.id;
        let lastCartesian = Cesium.Cartesian3.fromDegrees(lon, lat, Math.max(alt * 0.3048, 200));
        entity = viewer.entities.add({
          id: `flight-${flightId}`,
          // Stable callback — Cesium re-reads each frame; no SampledPosition restarts
          position: new Cesium.CallbackPositionProperty(() => {
            const p = getLivePosition(flightId);
            const meta = metaRef.current.get(flightId);
            const la = p?.lat ?? meta?.lat;
            const lo = p?.lon ?? meta?.lon;
            const al = p?.alt ?? meta?.altitude ?? 0;
            if (la == null || lo == null) return lastCartesian;
            lastCartesian = Cesium.Cartesian3.fromDegrees(lo, la, Math.max(al * 0.3048, 200));
            return lastCartesian;
          }, false),
          billboard: {
            image: getAircraftIconDataUrl(alt, hdg),
            width: selected ? 36 : 28,
            height: selected ? 36 : 28,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            disableDepthTestDistance: 0,
            color: Cesium.Color.WHITE,
            heightReference: Cesium.HeightReference.NONE,
          },
          label: {
            text: f.callsign,
            font: "10px JetBrains Mono, monospace",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 16),
            disableDepthTestDistance: 0,
            show: labelBudget > 0 || selected,
          },
        });
        entitiesRef.current.set(f.id, entity);
        iconKeyRef.current.set(f.id, iconKey);
      } else {
        if (entity.billboard) {
          entity.billboard.width = new Cesium.ConstantProperty(selected ? 36 : 28);
          entity.billboard.height = new Cesium.ConstantProperty(selected ? 36 : 28);
          if (iconKeyRef.current.get(f.id) !== iconKey) {
            entity.billboard.image = new Cesium.ConstantProperty(getAircraftIconDataUrl(alt, hdg));
            iconKeyRef.current.set(f.id, iconKey);
          }
        }
        if (entity.label) {
          entity.label.show = new Cesium.ConstantProperty(labelBudget > 0 || selected);
          entity.label.text = new Cesium.ConstantProperty(f.callsign);
        }
      }

      if (labelBudget > 0) labelBudget--;
    }

    // Soft prune — grace for missed polls; drop filtered-out / out-of-view immediately
    for (const [id, entity] of entitiesRef.current) {
      const filteredOut = !metaRef.current.has(id);
      const seenAt = lastSeenRef.current.get(id) ?? 0;
      const live = getLivePosition(id);
      const meta = metaRef.current.get(id);
      const lat = live?.lat ?? meta?.lat;
      const lon = live?.lon ?? meta?.lon;
      const far =
        lat == null || lon == null ? true : !nearViewport(lat, lon);
      if (filteredOut || far || now - seenAt > ENTITY_GRACE_MS) {
        viewer.entities.remove(entity);
        entitiesRef.current.delete(id);
        iconKeyRef.current.delete(id);
        lastSeenRef.current.delete(id);
      }
    }
  }, [filteredMeta, ready, filters.showLabels, selectedFlightId, viewport.lat, viewport.lon, viewport.radiusNm]);

  // Light icon/heading refresh when ADS-B samples arrive (positions already coast)
  useEffect(() => {
    if (!ready) return;
    const Cesium = cesiumRef.current;
    if (!Cesium) return;

    return subscribeLivePositions(() => {
      for (const [id, entity] of entitiesRef.current) {
        const live = getLivePosition(id);
        if (!live || !entity.billboard) continue;
        const iconKey = `${Math.round(live.alt / ALT_BUCKET) * ALT_BUCKET}:${Math.round(live.hdg / HEADING_BUCKET) * HEADING_BUCKET}`;
        if (iconKeyRef.current.get(id) === iconKey) continue;
        entity.billboard.image = new Cesium.ConstantProperty(
          getAircraftIconDataUrl(live.alt, live.hdg)
        );
        iconKeyRef.current.set(id, iconKey);
      }
    });
  }, [ready]);

  // Full route: departure → aircraft (flown) + aircraft → arrival (remaining)
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready) return;

    const clearRouteGraphics = () => {
      if (flownPathRef.current) {
        viewer.entities.remove(flownPathRef.current);
        flownPathRef.current = null;
      }
      if (remainPathRef.current) {
        viewer.entities.remove(remainPathRef.current);
        remainPathRef.current = null;
      }
      for (const e of routeMarkerRefs.current) viewer.entities.remove(e);
      routeMarkerRefs.current = [];
      routeEndsRef.current = null;
      realTrackRef.current = [];
    };

    clearRouteGraphics();
    if (!selectedFlightId) return;

    let cancelled = false;
    let lastPaint = 0;

    const addAirportMarker = (a: AirportRef, role: "dep" | "arr") => {
      const color =
        role === "dep"
          ? Cesium.Color.fromCssColorString("#22d3ee")
          : Cesium.Color.fromCssColorString("#fbbf24");
      routeMarkerRefs.current.push(
        viewer.entities.add({
          id: `route-apt-${role}-${selectedFlightId}`,
          position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat, 0),
          point: {
            pixelSize: 12,
            color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: 0,
          },
          label: {
            text: a.iata ?? a.icao,
            font: "bold 12px JetBrains Mono, monospace",
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            disableDepthTestDistance: 0,
            show: true,
          },
        })
      );
    };

    const samplesToHeights = (samples: FlightPositionSample[]) =>
      samples.flatMap((p) => [
        p.lon,
        p.lat,
        // Keep trail above the globe so long oceanic legs don't depth-clip away
        Math.max(p.altitude * 0.3048, 900),
      ]);

    const paintRoute = () => {
      const now = performance.now();
      if (now - lastPaint < 900) return;
      lastPaint = now;

      const ends = routeEndsRef.current;
      const live = getLivePosition(selectedFlightId);
      const meta = metaRef.current.get(selectedFlightId);
      const curLat = live?.lat ?? meta?.lat;
      const curLon = live?.lon ?? meta?.lon;
      const curAlt = live?.alt ?? meta?.altitude ?? 35000;
      if (curLat == null || curLon == null) return;

      const destination = ends?.destination;
      const hasDest =
        destination &&
        destination.icao !== "ZZZZ" &&
        Number.isFinite(destination.lat) &&
        Number.isFinite(destination.lon) &&
        (Math.abs(destination.lat) > 0.01 || Math.abs(destination.lon) > 0.01);

      // Prefer real ADS-B track (turns/curves); append live coast samples
      const historical = realTrackRef.current;
      const clientTrail = getClientTrail(selectedFlightId);
      let flownSamples: FlightPositionSample[] = [];
      if (historical.length >= 2) {
        flownSamples = historical.slice();
        const last = flownSamples[flownSamples.length - 1]!;
        for (const p of clientTrail) {
          const far =
            Math.abs(p.lat - last.lat) > 0.0015 || Math.abs(p.lon - last.lon) > 0.0015;
          if (far && (p.recordedAt ?? 0) >= (last.recordedAt ?? 0)) {
            flownSamples.push(p);
          }
        }
        const tip = flownSamples[flownSamples.length - 1]!;
        if (Math.abs(tip.lat - curLat) > 0.0004 || Math.abs(tip.lon - curLon) > 0.0004) {
          flownSamples.push({
            lat: curLat,
            lon: curLon,
            altitude: curAlt,
            speed: live?.spd ?? tip.speed,
            heading: live?.hdg ?? tip.heading,
            verticalSpeed: live?.vs ?? 0,
            recordedAt: Date.now(),
          });
        }
      } else if (clientTrail.length >= 2) {
        flownSamples = clientTrail.slice();
      }

      let flownHeights = samplesToHeights(flownSamples);

      // Last resort only: straight stub when no ADS-B history exists yet
      if (flownHeights.length < 6 && ends?.origin && ends.origin.icao !== "ZZZZ") {
        const o = ends.origin;
        const pts = sampleGreatCircle(o.lat, o.lon, curLat, curLon, 16);
        flownHeights = pts.flatMap((p, i) => {
          const t = i / Math.max(1, pts.length - 1);
          return [p.lon, p.lat, Math.max(cruiseAltitudeProfile(t * 0.8, curAlt) * 0.3048, 120)];
        });
      }

      const color = Cesium.Color.fromCssColorString(altitudeColorHex(curAlt));
      const depthFail = Cesium.Color.TRANSPARENT;

      if (flownPathRef.current) {
        viewer.entities.remove(flownPathRef.current);
        flownPathRef.current = null;
      }
      if (flownHeights.length >= 6) {
        const solid = color.withAlpha(0.98);
        // Solid outline (no glow taper) so the trail stays clear all the way to departure
        flownPathRef.current = viewer.entities.add({
          id: `route-flown-${selectedFlightId}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(flownHeights),
            width: 7,
            material: new Cesium.PolylineOutlineMaterialProperty({
              color: solid,
              outlineWidth: 2,
              outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
            }),
            // Keep the far end of long oceanic legs visible (e.g. Honiara→BNE)
            depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
              color: solid.withAlpha(0.75),
              outlineWidth: 1,
              outlineColor: Cesium.Color.BLACK.withAlpha(0.4),
            }),
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
          },
        });
      }

      if (remainPathRef.current) {
        viewer.entities.remove(remainPathRef.current);
        remainPathRef.current = null;
      }
      if (hasDest) {
        const remainPts = sampleGreatCircle(
          curLat,
          curLon,
          destination.lat,
          destination.lon,
          Math.max(20, Math.round(ROUTE_SAMPLES * 0.5))
        );
        const remainHeights = remainPts.flatMap((p, i) => {
          const t = i / Math.max(1, remainPts.length - 1);
          const altFt = cruiseAltitudeProfile(0.55 + 0.45 * t, Math.max(curAlt, 8000));
          return [p.lon, p.lat, Math.max(altFt * 0.3048, 120)];
        });

        remainPathRef.current = viewer.entities.add({
          id: `route-remain-${selectedFlightId}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(remainHeights),
            width: 5,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString("#94a3b8").withAlpha(0.85),
              dashLength: 18,
            }),
            depthFailMaterial: depthFail,
            clampToGround: false,
            arcType: Cesium.ArcType.GEODESIC,
          },
        });
      }
    };

    // Resolve airports + real ADS-B track (with turns)
    void (async () => {
      try {
        const res = await fetch(`/api/flights/${encodeURIComponent(selectedFlightId)}`);
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          flight?: LiveFlight;
          positions?: FlightPositionSample[];
        };
        const f = json.flight;
        if (!f || cancelled) return;
        if (
          f.origin?.icao &&
          f.origin.icao !== "ZZZZ" &&
          f.destination?.icao &&
          f.destination.icao !== "ZZZZ"
        ) {
          routeEndsRef.current = { origin: f.origin, destination: f.destination };
          addAirportMarker(f.origin, "dep");
          addAirportMarker(f.destination, "arr");
        }
        if (json.positions && json.positions.length >= 2) {
          realTrackRef.current = json.positions;
        }
        lastPaint = 0;
        paintRoute();
      } catch {
        lastPaint = 0;
        paintRoute();
      }
    })();

    const unsub = subscribeLivePositions(paintRoute);
    return () => {
      cancelled = true;
      unsub();
      clearRouteGraphics();
    };
  }, [selectedFlightId, ready]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !followSelected || !selectedFlightId) return;
    const live = getLivePosition(selectedFlightId);
    const f = flights.find((x) => x.id === selectedFlightId);
    const lat = live?.lat ?? f?.lat;
    const lon = live?.lon ?? f?.lon;
    const alt = live?.alt ?? f?.altitude ?? 0;
    if (lat == null || lon == null) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, Math.max(alt * 0.3048 + 60_000, 80_000)),
      duration: 1.1,
    });
  }, [followSelected, selectedFlightId, flights]);

  // Fly camera when search / airport selection requests a destination
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready || !cameraFlyTo) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        cameraFlyTo.lon,
        cameraFlyTo.lat,
        cameraFlyTo.height
      ),
      duration: 1.6,
    });
  }, [cameraFlyTo, ready]);

  // Highlight selected airport
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !ready) return;

    const existing = viewer.entities.getById("selected-airport-pin");
    if (existing) viewer.entities.remove(existing);

    if (!selectedAirport) return;

    viewer.entities.add({
      id: "selected-airport-pin",
      position: Cesium.Cartesian3.fromDegrees(
        selectedAirport.lon,
        selectedAirport.lat,
        3_000
      ),
      billboard: {
        image: getAirportPinDataUrl(true),
        width: 40,
        height: 40,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString("#f59e0b"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: selectedAirport.iata ?? selectedAirport.icao,
        font: "bold 13px JetBrains Mono, monospace",
        fillColor: Cesium.Color.fromCssColorString("#fbbf24"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -42),
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: true,
      },
    });

    return () => {
      const pin = viewer.entities.getById("selected-airport-pin");
      if (pin) viewer.entities.remove(pin);
    };
  }, [selectedAirport, ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#070b14]/80">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
            <p className="font-mono text-sm tracking-widest text-cyan-300/80">CONNECTING ADS-B…</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#070b14]">
          <p className="text-rose-300">{error}</p>
        </div>
      )}
    </div>
  );
}
