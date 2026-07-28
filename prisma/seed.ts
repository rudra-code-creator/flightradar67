import { PrismaClient, AircraftType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const airlines = [
  { icao: "QFA", iata: "QF", name: "Qantas", country: "Australia", logoUrl: null },
  { icao: "SIA", iata: "SQ", name: "Singapore Airlines", country: "Singapore", logoUrl: null },
  { icao: "BAW", iata: "BA", name: "British Airways", country: "United Kingdom", logoUrl: null },
  { icao: "UAL", iata: "UA", name: "United Airlines", country: "United States", logoUrl: null },
  { icao: "AAL", iata: "AA", name: "American Airlines", country: "United States", logoUrl: null },
  { icao: "DAL", iata: "DL", name: "Delta Air Lines", country: "United States", logoUrl: null },
  { icao: "UAE", iata: "EK", name: "Emirates", country: "United Arab Emirates", logoUrl: null },
  { icao: "CPA", iata: "CX", name: "Cathay Pacific", country: "Hong Kong", logoUrl: null },
  { icao: "ANA", iata: "NH", name: "All Nippon Airways", country: "Japan", logoUrl: null },
  { icao: "JAL", iata: "JL", name: "Japan Airlines", country: "Japan", logoUrl: null },
  { icao: "DLH", iata: "LH", name: "Lufthansa", country: "Germany", logoUrl: null },
  { icao: "AFR", iata: "AF", name: "Air France", country: "France", logoUrl: null },
  { icao: "KLM", iata: "KL", name: "KLM", country: "Netherlands", logoUrl: null },
  { icao: "CCA", iata: "CA", name: "Air China", country: "China", logoUrl: null },
  { icao: "CES", iata: "MU", name: "China Eastern", country: "China", logoUrl: null },
  { icao: "THA", iata: "TG", name: "Thai Airways", country: "Thailand", logoUrl: null },
  { icao: "MAS", iata: "MH", name: "Malaysia Airlines", country: "Malaysia", logoUrl: null },
  { icao: "VOZ", iata: "VA", name: "Virgin Australia", country: "Australia", logoUrl: null },
  { icao: "JBU", iata: "B6", name: "JetBlue", country: "United States", logoUrl: null },
  { icao: "FDX", iata: "FX", name: "FedEx", country: "United States", logoUrl: null },
  { icao: "UPS", iata: "5X", name: "UPS Airlines", country: "United States", logoUrl: null },
];

const airports = [
  {
    icao: "YSSY",
    iata: "SYD",
    name: "Sydney Kingsford Smith",
    city: "Sydney",
    country: "Australia",
    lat: -33.9399,
    lon: 151.1753,
    timezone: "Australia/Sydney",
    elevation: 21,
    runways: [
      { id: "16L/34R", heading: 160, lengthFt: 12999 },
      { id: "16R/34L", heading: 160, lengthFt: 13000 },
      { id: "07/25", heading: 70, lengthFt: 8302 },
    ],
  },
  {
    icao: "WSSS",
    iata: "SIN",
    name: "Singapore Changi",
    city: "Singapore",
    country: "Singapore",
    lat: 1.3644,
    lon: 103.9915,
    timezone: "Asia/Singapore",
    elevation: 22,
    runways: [
      { id: "02L/20R", heading: 20, lengthFt: 13123 },
      { id: "02C/20C", heading: 20, lengthFt: 13123 },
    ],
  },
  {
    icao: "EGLL",
    iata: "LHR",
    name: "London Heathrow",
    city: "London",
    country: "United Kingdom",
    lat: 51.47,
    lon: -0.4543,
    timezone: "Europe/London",
    elevation: 83,
    runways: [
      { id: "09L/27R", heading: 90, lengthFt: 12802 },
      { id: "09R/27L", heading: 90, lengthFt: 12001 },
    ],
  },
  {
    icao: "YBBN",
    iata: "BNE",
    name: "Brisbane",
    city: "Brisbane",
    country: "Australia",
    lat: -27.3842,
    lon: 153.1175,
    timezone: "Australia/Brisbane",
    elevation: 13,
    runways: [{ id: "01/19", heading: 10, lengthFt: 11680 }],
  },
  {
    icao: "RJTT",
    iata: "HND",
    name: "Tokyo Haneda",
    city: "Tokyo",
    country: "Japan",
    lat: 35.5494,
    lon: 139.7798,
    timezone: "Asia/Tokyo",
    elevation: 21,
    runways: [
      { id: "16L/34R", heading: 160, lengthFt: 9840 },
      { id: "16R/34L", heading: 160, lengthFt: 8200 },
    ],
  },
  {
    icao: "RJAA",
    iata: "NRT",
    name: "Narita International",
    city: "Tokyo",
    country: "Japan",
    lat: 35.7647,
    lon: 140.3864,
    timezone: "Asia/Tokyo",
    elevation: 141,
    runways: [
      { id: "16R/34L", heading: 160, lengthFt: 13123 },
      { id: "16L/34R", heading: 160, lengthFt: 8202 },
    ],
  },
  {
    icao: "KLAX",
    iata: "LAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    country: "United States",
    lat: 33.9425,
    lon: -118.4081,
    timezone: "America/Los_Angeles",
    elevation: 125,
    runways: [
      { id: "06L/24R", heading: 70, lengthFt: 8926 },
      { id: "07L/25R", heading: 70, lengthFt: 12923 },
    ],
  },
  {
    icao: "KJFK",
    iata: "JFK",
    name: "John F Kennedy International",
    city: "New York",
    country: "United States",
    lat: 40.6413,
    lon: -73.7781,
    timezone: "America/New_York",
    elevation: 13,
    runways: [
      { id: "04L/22R", heading: 40, lengthFt: 11351 },
      { id: "13L/31R", heading: 130, lengthFt: 14511 },
    ],
  },
  {
    icao: "OMDB",
    iata: "DXB",
    name: "Dubai International",
    city: "Dubai",
    country: "United Arab Emirates",
    lat: 25.2532,
    lon: 55.3657,
    timezone: "Asia/Dubai",
    elevation: 62,
    runways: [
      { id: "12L/30R", heading: 120, lengthFt: 13123 },
      { id: "12R/30L", heading: 120, lengthFt: 13124 },
    ],
  },
  {
    icao: "VHHH",
    iata: "HKG",
    name: "Hong Kong International",
    city: "Hong Kong",
    country: "Hong Kong",
    lat: 22.308,
    lon: 113.9185,
    timezone: "Asia/Hong_Kong",
    elevation: 28,
    runways: [
      { id: "07L/25R", heading: 70, lengthFt: 12467 },
      { id: "07R/25L", heading: 70, lengthFt: 12467 },
    ],
  },
  {
    icao: "LFPG",
    iata: "CDG",
    name: "Paris Charles de Gaulle",
    city: "Paris",
    country: "France",
    lat: 49.0097,
    lon: 2.5479,
    timezone: "Europe/Paris",
    elevation: 392,
    runways: [
      { id: "08L/26R", heading: 90, lengthFt: 13829 },
      { id: "09L/27R", heading: 90, lengthFt: 8858 },
    ],
  },
  {
    icao: "EDDF",
    iata: "FRA",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "Germany",
    lat: 50.0379,
    lon: 8.5622,
    timezone: "Europe/Berlin",
    elevation: 364,
    runways: [
      { id: "07C/25C", heading: 70, lengthFt: 13123 },
      { id: "07L/25R", heading: 70, lengthFt: 13123 },
    ],
  },
  {
    icao: "EHAM",
    iata: "AMS",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    lat: 52.3105,
    lon: 4.7683,
    timezone: "Europe/Amsterdam",
    elevation: -11,
    runways: [
      { id: "18L/36R", heading: 183, lengthFt: 11155 },
      { id: "06/24", heading: 60, lengthFt: 11483 },
    ],
  },
  {
    icao: "YMML",
    iata: "MEL",
    name: "Melbourne Tullamarine",
    city: "Melbourne",
    country: "Australia",
    lat: -37.6733,
    lon: 144.8433,
    timezone: "Australia/Melbourne",
    elevation: 434,
    runways: [
      { id: "16/34", heading: 160, lengthFt: 11998 },
      { id: "09/27", heading: 90, lengthFt: 7490 },
    ],
  },
  {
    icao: "NZAA",
    iata: "AKL",
    name: "Auckland",
    city: "Auckland",
    country: "New Zealand",
    lat: -37.0082,
    lon: 174.785,
    timezone: "Pacific/Auckland",
    elevation: 23,
    runways: [{ id: "05L/23R", heading: 50, lengthFt: 11934 }],
  },
  {
    icao: "KORD",
    iata: "ORD",
    name: "Chicago O'Hare",
    city: "Chicago",
    country: "United States",
    lat: 41.9742,
    lon: -87.9073,
    timezone: "America/Chicago",
    elevation: 672,
    runways: [
      { id: "10L/28R", heading: 100, lengthFt: 13000 },
      { id: "09L/27R", heading: 90, lengthFt: 7967 },
    ],
  },
  {
    icao: "KSFO",
    iata: "SFO",
    name: "San Francisco International",
    city: "San Francisco",
    country: "United States",
    lat: 37.6213,
    lon: -122.379,
    timezone: "America/Los_Angeles",
    elevation: 13,
    runways: [
      { id: "28L/10R", heading: 280, lengthFt: 11870 },
      { id: "28R/10L", heading: 280, lengthFt: 11381 },
    ],
  },
  {
    icao: "VTBS",
    iata: "BKK",
    name: "Suvarnabhumi",
    city: "Bangkok",
    country: "Thailand",
    lat: 13.69,
    lon: 100.7501,
    timezone: "Asia/Bangkok",
    elevation: 5,
    runways: [
      { id: "01L/19R", heading: 10, lengthFt: 13123 },
      { id: "01R/19L", heading: 10, lengthFt: 13123 },
    ],
  },
  {
    icao: "VIDP",
    iata: "DEL",
    name: "Indira Gandhi International",
    city: "Delhi",
    country: "India",
    lat: 28.5562,
    lon: 77.1,
    timezone: "Asia/Kolkata",
    elevation: 777,
    runways: [
      { id: "10/28", heading: 100, lengthFt: 12525 },
      { id: "11/29", heading: 110, lengthFt: 14534 },
    ],
  },
  {
    icao: "ZBAA",
    iata: "PEK",
    name: "Beijing Capital",
    city: "Beijing",
    country: "China",
    lat: 40.0799,
    lon: 116.6031,
    timezone: "Asia/Shanghai",
    elevation: 116,
    runways: [
      { id: "01/19", heading: 10, lengthFt: 12467 },
      { id: "18L/36R", heading: 180, lengthFt: 12467 },
    ],
  },
  {
    icao: "FAOR",
    iata: "JNB",
    name: "O.R. Tambo International",
    city: "Johannesburg",
    country: "South Africa",
    lat: -26.1392,
    lon: 28.246,
    timezone: "Africa/Johannesburg",
    elevation: 5558,
    runways: [
      { id: "03L/21R", heading: 30, lengthFt: 14495 },
      { id: "03R/21L", heading: 30, lengthFt: 11155 },
    ],
  },
  {
    icao: "SBGR",
    iata: "GRU",
    name: "São Paulo Guarulhos",
    city: "São Paulo",
    country: "Brazil",
    lat: -23.4356,
    lon: -46.4731,
    timezone: "America/Sao_Paulo",
    elevation: 2459,
    runways: [
      { id: "09L/27R", heading: 90, lengthFt: 12139 },
      { id: "09R/27L", heading: 90, lengthFt: 9843 },
    ],
  },
  {
    icao: "CYYZ",
    iata: "YYZ",
    name: "Toronto Pearson",
    city: "Toronto",
    country: "Canada",
    lat: 43.6777,
    lon: -79.6248,
    timezone: "America/Toronto",
    elevation: 569,
    runways: [
      { id: "05/23", heading: 50, lengthFt: 11120 },
      { id: "06L/24R", heading: 60, lengthFt: 14471 },
    ],
  },
  {
    icao: "YPPH",
    iata: "PER",
    name: "Perth",
    city: "Perth",
    country: "Australia",
    lat: -31.9403,
    lon: 115.9669,
    timezone: "Australia/Perth",
    elevation: 67,
    runways: [
      { id: "03/21", heading: 30, lengthFt: 11299 },
      { id: "06/24", heading: 60, lengthFt: 7087 },
    ],
  },
];

const aircraftModels: Record<AircraftType, string[]> = {
  COMMERCIAL: ["A320", "A321", "A330-300", "A350-900", "A380-800", "B737-800", "B777-300ER", "B787-9", "B747-8"],
  CARGO: ["B747-8F", "B777F", "MD-11F", "A330-200F"],
  PRIVATE: ["G650", "Citation X", "Global 7500", "Phenom 300", "King Air 350"],
};

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function padReg(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

async function main() {
  console.log("Seeding FlightRadar67…");

  await prisma.flightPosition.deleteMany();
  await prisma.savedFlight.deleteMany();
  await prisma.favouriteAirport.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.aircraft.deleteMany();
  await prisma.airline.deleteMany();
  await prisma.airport.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const demoHash = await bcrypt.hash("password123", 10);
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@flightradar67.com",
      name: "Demo Pilot",
      passwordHash: demoHash,
    },
  });

  const createdAirlines = await Promise.all(
    airlines.map((a) => prisma.airline.create({ data: a }))
  );

  const createdAirports = await Promise.all(
    airports.map((a) =>
      prisma.airport.create({
        data: {
          icao: a.icao,
          iata: a.iata,
          name: a.name,
          city: a.city,
          country: a.country,
          lat: a.lat,
          lon: a.lon,
          timezone: a.timezone,
          elevation: a.elevation,
          runways: a.runways,
        },
      })
    )
  );

  const cargoAirlines = createdAirlines.filter((a) => a.icao === "FDX" || a.icao === "UPS");
  const passengerAirlines = createdAirlines.filter((a) => a.icao !== "FDX" && a.icao !== "UPS");

  const aircraft = [];
  for (let i = 0; i < 120; i++) {
    const type: AircraftType =
      i % 12 === 0 ? "CARGO" : i % 9 === 0 ? "PRIVATE" : "COMMERCIAL";
    const airline =
      type === "CARGO"
        ? randomItem(cargoAirlines)
        : type === "PRIVATE"
          ? null
          : randomItem(passengerAirlines);
    const regPrefix =
      type === "PRIVATE" ? "N" : airline?.country === "Australia" ? "VH" : airline?.iata ?? "X";
    aircraft.push(
      await prisma.aircraft.create({
        data: {
          registration: padReg(regPrefix, i + 1),
          icao24: `a${(100000 + i).toString(16)}`,
          model: randomItem(aircraftModels[type]),
          type,
          airlineId: airline?.id,
        },
      })
    );
  }

  const now = Date.now();
  for (let i = 0; i < 40; i++) {
    const dep = randomItem(createdAirports);
    let arr = randomItem(createdAirports);
    while (arr.id === dep.id) arr = randomItem(createdAirports);
    const ac = aircraft[i % aircraft.length]!;
    const airline = createdAirlines.find((a) => a.id === ac.airlineId) ?? randomItem(passengerAirlines);
    const flightNumber = `${airline.iata ?? "XX"}${100 + i}`;
    await prisma.flight.create({
      data: {
        callsign: `${airline.icao}${100 + i}`,
        flightNumber,
        status: "EN_ROUTE",
        departureId: dep.id,
        arrivalId: arr.id,
        aircraftId: ac.id,
        airlineId: airline.id,
        scheduledDep: new Date(now - 3 * 3600_000),
        scheduledArr: new Date(now + 5 * 3600_000),
        actualDep: new Date(now - 2.8 * 3600_000),
        progress: 0.2 + Math.random() * 0.6,
        distanceNm: 800 + Math.random() * 5000,
      },
    });
  }

  await prisma.favouriteAirport.create({
    data: {
      userId: demoUser.id,
      airportId: createdAirports.find((a) => a.iata === "SYD")!.id,
    },
  });

  console.log(
    `Seeded ${createdAirlines.length} airlines, ${createdAirports.length} airports, ${aircraft.length} aircraft, demo user demo@flightradar67.com / password123`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
