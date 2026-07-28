export type AircraftCategory = "commercial" | "cargo" | "private";

export type LiveFlightStatus =
  | "scheduled"
  | "boarding"
  | "departed"
  | "en_route"
  | "approaching"
  | "landed";

export interface AirportRef {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string | null;
}

export interface AirlineRef {
  icao: string;
  iata: string | null;
  name: string;
}

export interface LiveFlight {
  id: string;
  callsign: string;
  flightNumber: string;
  icao24: string;
  registration: string;
  model: string;
  type: AircraftCategory;
  status: LiveFlightStatus;
  airline: AirlineRef | null;
  origin: AirportRef;
  destination: AirportRef;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalSpeed: number;
  progress: number;
  distanceNm: number;
  remainingNm: number;
  eta: string;
  scheduledDep: string;
  scheduledArr: string;
  actualDep: string | null;
  updatedAt: number;
}

export interface FlightPositionSample {
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalSpeed: number;
  recordedAt: number;
}

export interface FlightFilters {
  west?: number;
  south?: number;
  east?: number;
  north?: number;
  lat?: number;
  lon?: number;
  radius?: number;
  airline?: string;
  type?: AircraftCategory | "all";
  minAltitude?: number;
  maxAltitude?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface StatisticsSnapshot {
  totalFlights: number;
  airborne: number;
  byType: Record<AircraftCategory, number>;
  byAirline: { icao: string; name: string; count: number }[];
  busyAirports: { code: string; name: string; city: string; arrivals: number; departures: number }[];
  avgAltitude: number;
  avgSpeed: number;
  updatedAt: number;
}
