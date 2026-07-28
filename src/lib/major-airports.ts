import type { AirportRef } from "./types";

export interface MajorAirport extends AirportRef {
  timezone: string;
  elevationFt?: number;
  runways?: { id: string; heading: number; lengthFt: number }[];
}

/** Global hub / major international airports for map pins and fallback metadata. */
export const MAJOR_AIRPORTS: MajorAirport[] = [
  // Oceania
  { icao: "YSSY", iata: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9399, lon: 151.1753, timezone: "Australia/Sydney", elevationFt: 21, runways: [{ id: "16L/34R", heading: 160, lengthFt: 12999 }, { id: "16R/34L", heading: 160, lengthFt: 13000 }] },
  { icao: "YMML", iata: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", lat: -37.6733, lon: 144.8433, timezone: "Australia/Melbourne", elevationFt: 434, runways: [{ id: "16/34", heading: 160, lengthFt: 11998 }, { id: "09/27", heading: 90, lengthFt: 7480 }] },
  { icao: "YBBN", iata: "BNE", name: "Brisbane", city: "Brisbane", country: "Australia", lat: -27.3842, lon: 153.1175, timezone: "Australia/Brisbane", elevationFt: 13, runways: [{ id: "01/19", heading: 10, lengthFt: 11680 }] },
  { icao: "YPPH", iata: "PER", name: "Perth", city: "Perth", country: "Australia", lat: -31.9403, lon: 115.9669, timezone: "Australia/Perth", elevationFt: 67 },
  { icao: "YSCB", iata: "CBR", name: "Canberra", city: "Canberra", country: "Australia", lat: -35.3069, lon: 149.195, timezone: "Australia/Sydney", elevationFt: 1886 },
  { icao: "YPDN", iata: "DRW", name: "Darwin International", city: "Darwin", country: "Australia", lat: -12.4147, lon: 130.8767, timezone: "Australia/Darwin", elevationFt: 103 },
  { icao: "YBCS", iata: "CNS", name: "Cairns", city: "Cairns", country: "Australia", lat: -16.8858, lon: 145.7553, timezone: "Australia/Brisbane", elevationFt: 10 },
  { icao: "YBCG", iata: "OOL", name: "Gold Coast", city: "Gold Coast", country: "Australia", lat: -28.1644, lon: 153.5047, timezone: "Australia/Brisbane", elevationFt: 21 },
  { icao: "NZAA", iata: "AKL", name: "Auckland", city: "Auckland", country: "New Zealand", lat: -37.0082, lon: 174.785, timezone: "Pacific/Auckland", elevationFt: 23 },
  { icao: "NZCH", iata: "CHC", name: "Christchurch", city: "Christchurch", country: "New Zealand", lat: -43.4894, lon: 172.532, timezone: "Pacific/Auckland", elevationFt: 123 },
  { icao: "NZWN", iata: "WLG", name: "Wellington", city: "Wellington", country: "New Zealand", lat: -41.3272, lon: 174.805, timezone: "Pacific/Auckland", elevationFt: 41 },
  { icao: "NFFF", iata: "NAN", name: "Nadi International", city: "Nadi", country: "Fiji", lat: -17.7554, lon: 177.443, timezone: "Pacific/Fiji", elevationFt: 59 },

  // East / SE Asia
  { icao: "WSSS", iata: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lon: 103.9915, timezone: "Asia/Singapore", elevationFt: 22, runways: [{ id: "02L/20R", heading: 20, lengthFt: 13123 }, { id: "02C/20C", heading: 20, lengthFt: 13123 }] },
  { icao: "VHHH", iata: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", lat: 22.308, lon: 113.9185, timezone: "Asia/Hong_Kong", elevationFt: 28 },
  { icao: "RJTT", iata: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lon: 139.7798, timezone: "Asia/Tokyo", elevationFt: 21 },
  { icao: "RJAA", iata: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", lat: 35.7647, lon: 140.3864, timezone: "Asia/Tokyo", elevationFt: 141 },
  { icao: "RJBB", iata: "KIX", name: "Kansai International", city: "Osaka", country: "Japan", lat: 34.4273, lon: 135.244, timezone: "Asia/Tokyo", elevationFt: 26 },
  { icao: "RKSI", iata: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea", lat: 37.4602, lon: 126.4407, timezone: "Asia/Seoul", elevationFt: 23 },
  { icao: "RCTP", iata: "TPE", name: "Taiwan Taoyuan", city: "Taipei", country: "Taiwan", lat: 25.0797, lon: 121.2342, timezone: "Asia/Taipei", elevationFt: 106 },
  { icao: "ZBAA", iata: "PEK", name: "Beijing Capital", city: "Beijing", country: "China", lat: 40.0799, lon: 116.6031, timezone: "Asia/Shanghai", elevationFt: 116 },
  { icao: "ZBAD", iata: "PKX", name: "Beijing Daxing", city: "Beijing", country: "China", lat: 39.5098, lon: 116.4105, timezone: "Asia/Shanghai", elevationFt: 98 },
  { icao: "ZSPD", iata: "PVG", name: "Shanghai Pudong", city: "Shanghai", country: "China", lat: 31.1434, lon: 121.805, timezone: "Asia/Shanghai", elevationFt: 13 },
  { icao: "ZGGG", iata: "CAN", name: "Guangzhou Baiyun", city: "Guangzhou", country: "China", lat: 23.3924, lon: 113.299, timezone: "Asia/Shanghai", elevationFt: 50 },
  { icao: "ZUTF", iata: "TFU", name: "Chengdu Tianfu", city: "Chengdu", country: "China", lat: 30.3125, lon: 104.445, timezone: "Asia/Shanghai", elevationFt: 1440 },
  { icao: "VMMC", iata: "MFM", name: "Macau International", city: "Macau", country: "Macau", lat: 22.1496, lon: 113.592, timezone: "Asia/Macau", elevationFt: 20 },
  { icao: "VTBS", iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", lat: 13.69, lon: 100.7501, timezone: "Asia/Bangkok", elevationFt: 5 },
  { icao: "VTBD", iata: "DMK", name: "Don Mueang", city: "Bangkok", country: "Thailand", lat: 13.9126, lon: 100.607, timezone: "Asia/Bangkok", elevationFt: 9 },
  { icao: "WMKK", iata: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", lat: 2.7456, lon: 101.7099, timezone: "Asia/Kuala_Lumpur", elevationFt: 69 },
  { icao: "WIII", iata: "CGK", name: "Soekarno–Hatta", city: "Jakarta", country: "Indonesia", lat: -6.1256, lon: 106.656, timezone: "Asia/Jakarta", elevationFt: 34 },
  { icao: "WADD", iata: "DPS", name: "Ngurah Rai (Bali)", city: "Denpasar", country: "Indonesia", lat: -8.7482, lon: 115.167, timezone: "Asia/Makassar", elevationFt: 14 },
  { icao: "RPLL", iata: "MNL", name: "Ninoy Aquino International", city: "Manila", country: "Philippines", lat: 14.5086, lon: 121.02, timezone: "Asia/Manila", elevationFt: 75 },
  { icao: "VVTS", iata: "SGN", name: "Tan Son Nhat", city: "Ho Chi Minh City", country: "Vietnam", lat: 10.8188, lon: 106.652, timezone: "Asia/Ho_Chi_Minh", elevationFt: 33 },
  { icao: "VVNB", iata: "HAN", name: "Noi Bai International", city: "Hanoi", country: "Vietnam", lat: 21.2212, lon: 105.807, timezone: "Asia/Ho_Chi_Minh", elevationFt: 39 },

  // South Asia / Middle East
  { icao: "VIDP", iata: "DEL", name: "Indira Gandhi International", city: "Delhi", country: "India", lat: 28.5562, lon: 77.1, timezone: "Asia/Kolkata", elevationFt: 777 },
  { icao: "VABB", iata: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", country: "India", lat: 19.0887, lon: 72.8679, timezone: "Asia/Kolkata", elevationFt: 39 },
  { icao: "VOBL", iata: "BLR", name: "Kempegowda International", city: "Bengaluru", country: "India", lat: 13.1989, lon: 77.7066, timezone: "Asia/Kolkata", elevationFt: 3000 },
  { icao: "VOMM", iata: "MAA", name: "Chennai International", city: "Chennai", country: "India", lat: 12.9941, lon: 80.1709, timezone: "Asia/Kolkata", elevationFt: 52 },
  { icao: "VGHS", iata: "DAC", name: "Hazrat Shahjalal", city: "Dhaka", country: "Bangladesh", lat: 23.8433, lon: 90.3978, timezone: "Asia/Dhaka", elevationFt: 30 },
  { icao: "OPKC", iata: "KHI", name: "Jinnah International", city: "Karachi", country: "Pakistan", lat: 24.9065, lon: 67.1608, timezone: "Asia/Karachi", elevationFt: 100 },
  { icao: "OMDB", iata: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", lat: 25.2532, lon: 55.3657, timezone: "Asia/Dubai", elevationFt: 62 },
  { icao: "OMDW", iata: "DWC", name: "Al Maktoum International", city: "Dubai", country: "United Arab Emirates", lat: 24.8962, lon: 55.1614, timezone: "Asia/Dubai", elevationFt: 171 },
  { icao: "OMAA", iata: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.433, lon: 54.6511, timezone: "Asia/Dubai", elevationFt: 88 },
  { icao: "OTHH", iata: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", lat: 25.2731, lon: 51.6081, timezone: "Asia/Qatar", elevationFt: 13 },
  { icao: "OEJN", iata: "JED", name: "King Abdulaziz International", city: "Jeddah", country: "Saudi Arabia", lat: 21.6796, lon: 39.1565, timezone: "Asia/Riyadh", elevationFt: 48 },
  { icao: "OERK", iata: "RUH", name: "King Khalid International", city: "Riyadh", country: "Saudi Arabia", lat: 24.9576, lon: 46.6988, timezone: "Asia/Riyadh", elevationFt: 2049 },
  { icao: "LLBG", iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "Israel", lat: 32.0114, lon: 34.8867, timezone: "Asia/Jerusalem", elevationFt: 135 },
  { icao: "OIIE", iata: "IKA", name: "Imam Khomeini International", city: "Tehran", country: "Iran", lat: 35.4161, lon: 51.1522, timezone: "Asia/Tehran", elevationFt: 3305 },
  { icao: "LTFM", iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", lat: 41.2753, lon: 28.7519, timezone: "Europe/Istanbul", elevationFt: 325 },

  // Europe
  { icao: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", lat: 51.47, lon: -0.4543, timezone: "Europe/London", elevationFt: 83 },
  { icao: "EGKK", iata: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom", lat: 51.1537, lon: -0.1821, timezone: "Europe/London", elevationFt: 202 },
  { icao: "EGCC", iata: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", lat: 53.3537, lon: -2.275, timezone: "Europe/London", elevationFt: 257 },
  { icao: "EIDW", iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", lat: 53.4213, lon: -6.2701, timezone: "Europe/Dublin", elevationFt: 242 },
  { icao: "LFPG", iata: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lon: 2.5479, timezone: "Europe/Paris", elevationFt: 392 },
  { icao: "LFPO", iata: "ORY", name: "Paris Orly", city: "Paris", country: "France", lat: 48.7233, lon: 2.3794, timezone: "Europe/Paris", elevationFt: 291 },
  { icao: "EDDF", iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", lat: 50.0379, lon: 8.5622, timezone: "Europe/Berlin", elevationFt: 364 },
  { icao: "EDDM", iata: "MUC", name: "Munich", city: "Munich", country: "Germany", lat: 48.3538, lon: 11.7861, timezone: "Europe/Berlin", elevationFt: 1487 },
  { icao: "EDDB", iata: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", lat: 52.3667, lon: 13.5033, timezone: "Europe/Berlin", elevationFt: 157 },
  { icao: "EHAM", iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lon: 4.7683, timezone: "Europe/Amsterdam", elevationFt: -11 },
  { icao: "EBBR", iata: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", lat: 50.9014, lon: 4.4844, timezone: "Europe/Brussels", elevationFt: 184 },
  { icao: "LSZH", iata: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4582, lon: 8.5555, timezone: "Europe/Zurich", elevationFt: 1416 },
  { icao: "LOWW", iata: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", lat: 48.1103, lon: 16.5697, timezone: "Europe/Vienna", elevationFt: 600 },
  { icao: "LEMD", iata: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain", lat: 40.4983, lon: -3.5676, timezone: "Europe/Madrid", elevationFt: 2001 },
  { icao: "LEBL", iata: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain", lat: 41.2971, lon: 2.0785, timezone: "Europe/Madrid", elevationFt: 12 },
  { icao: "LPPT", iata: "LIS", name: "Lisbon Humberto Delgado", city: "Lisbon", country: "Portugal", lat: 38.7813, lon: -9.1359, timezone: "Europe/Lisbon", elevationFt: 374 },
  { icao: "LIRF", iata: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lon: 12.2389, timezone: "Europe/Rome", elevationFt: 15 },
  { icao: "LIMC", iata: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy", lat: 45.6306, lon: 8.7281, timezone: "Europe/Rome", elevationFt: 768 },
  { icao: "LGAV", iata: "ATH", name: "Athens International", city: "Athens", country: "Greece", lat: 37.9364, lon: 23.9445, timezone: "Europe/Athens", elevationFt: 308 },
  { icao: "EKCH", iata: "CPH", name: "Copenhagen Kastrup", city: "Copenhagen", country: "Denmark", lat: 55.618, lon: 12.656, timezone: "Europe/Copenhagen", elevationFt: 17 },
  { icao: "ENGM", iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway", lat: 60.1939, lon: 11.1004, timezone: "Europe/Oslo", elevationFt: 681 },
  { icao: "ESSA", iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", lat: 59.6519, lon: 17.9186, timezone: "Europe/Stockholm", elevationFt: 137 },
  { icao: "EFHK", iata: "HEL", name: "Helsinki Vantaa", city: "Helsinki", country: "Finland", lat: 60.3172, lon: 24.9633, timezone: "Europe/Helsinki", elevationFt: 179 },
  { icao: "EPWA", iata: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland", lat: 52.1657, lon: 20.9671, timezone: "Europe/Warsaw", elevationFt: 361 },
  { icao: "LKPR", iata: "PRG", name: "Prague Václav Havel", city: "Prague", country: "Czechia", lat: 50.1008, lon: 14.26, timezone: "Europe/Prague", elevationFt: 1247 },
  { icao: "LHBP", iata: "BUD", name: "Budapest Ferenc Liszt", city: "Budapest", country: "Hungary", lat: 47.4298, lon: 19.2611, timezone: "Europe/Budapest", elevationFt: 495 },
  { icao: "UUEE", iata: "SVO", name: "Sheremetyevo", city: "Moscow", country: "Russia", lat: 55.9726, lon: 37.4146, timezone: "Europe/Moscow", elevationFt: 622 },
  { icao: "ULLI", iata: "LED", name: "Pulkovo", city: "Saint Petersburg", country: "Russia", lat: 59.8003, lon: 30.2625, timezone: "Europe/Moscow", elevationFt: 79 },

  // Africa
  { icao: "FAOR", iata: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "South Africa", lat: -26.1392, lon: 28.246, timezone: "Africa/Johannesburg", elevationFt: 5558 },
  { icao: "FACT", iata: "CPT", name: "Cape Town International", city: "Cape Town", country: "South Africa", lat: -33.9648, lon: 18.6017, timezone: "Africa/Johannesburg", elevationFt: 151 },
  { icao: "HECA", iata: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt", lat: 30.1219, lon: 31.4056, timezone: "Africa/Cairo", elevationFt: 382 },
  { icao: "GMMN", iata: "CMN", name: "Mohammed V International", city: "Casablanca", country: "Morocco", lat: 33.3675, lon: -7.5898, timezone: "Africa/Casablanca", elevationFt: 656 },
  { icao: "DNMM", iata: "LOS", name: "Murtala Muhammed", city: "Lagos", country: "Nigeria", lat: 6.5774, lon: 3.3212, timezone: "Africa/Lagos", elevationFt: 135 },
  { icao: "HKJK", iata: "NBO", name: "Jomo Kenyatta International", city: "Nairobi", country: "Kenya", lat: -1.3192, lon: 36.9278, timezone: "Africa/Nairobi", elevationFt: 5327 },
  { icao: "HLLT", iata: "TIP", name: "Tripoli International", city: "Tripoli", country: "Libya", lat: 32.6635, lon: 13.159, timezone: "Africa/Tripoli", elevationFt: 263 },
  { icao: "DTTA", iata: "TUN", name: "Tunis–Carthage", city: "Tunis", country: "Tunisia", lat: 36.851, lon: 10.2272, timezone: "Africa/Tunis", elevationFt: 22 },
  { icao: "HAAB", iata: "ADD", name: "Addis Ababa Bole", city: "Addis Ababa", country: "Ethiopia", lat: 8.9779, lon: 38.7993, timezone: "Africa/Addis_Ababa", elevationFt: 7630 },

  // North America
  { icao: "KJFK", iata: "JFK", name: "John F Kennedy International", city: "New York", country: "United States", lat: 40.6413, lon: -73.7781, timezone: "America/New_York", elevationFt: 13 },
  { icao: "KEWR", iata: "EWR", name: "Newark Liberty", city: "Newark", country: "United States", lat: 40.6895, lon: -74.1745, timezone: "America/New_York", elevationFt: 18 },
  { icao: "KBOS", iata: "BOS", name: "Boston Logan", city: "Boston", country: "United States", lat: 42.3656, lon: -71.0096, timezone: "America/New_York", elevationFt: 20 },
  { icao: "KORD", iata: "ORD", name: "Chicago O'Hare", city: "Chicago", country: "United States", lat: 41.9742, lon: -87.9073, timezone: "America/Chicago", elevationFt: 672 },
  { icao: "KATL", iata: "ATL", name: "Hartsfield–Jackson Atlanta", city: "Atlanta", country: "United States", lat: 33.6407, lon: -84.4277, timezone: "America/New_York", elevationFt: 1026 },
  { icao: "KMIA", iata: "MIA", name: "Miami International", city: "Miami", country: "United States", lat: 25.7959, lon: -80.287, timezone: "America/New_York", elevationFt: 8 },
  { icao: "KDFW", iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "United States", lat: 32.8998, lon: -97.0403, timezone: "America/Chicago", elevationFt: 607 },
  { icao: "KDEN", iata: "DEN", name: "Denver International", city: "Denver", country: "United States", lat: 39.8561, lon: -104.6737, timezone: "America/Denver", elevationFt: 5431 },
  { icao: "KIAH", iata: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "United States", lat: 29.9902, lon: -95.3368, timezone: "America/Chicago", elevationFt: 97 },
  { icao: "KSEA", iata: "SEA", name: "Seattle–Tacoma", city: "Seattle", country: "United States", lat: 47.4502, lon: -122.3088, timezone: "America/Los_Angeles", elevationFt: 433 },
  { icao: "KLAX", iata: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", lat: 33.9425, lon: -118.4081, timezone: "America/Los_Angeles", elevationFt: 125 },
  { icao: "KSFO", iata: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", lat: 37.6213, lon: -122.379, timezone: "America/Los_Angeles", elevationFt: 13 },
  { icao: "KLAS", iata: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "United States", lat: 36.084, lon: -115.1537, timezone: "America/Los_Angeles", elevationFt: 2181 },
  { icao: "KPHX", iata: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix", country: "United States", lat: 33.4373, lon: -112.0078, timezone: "America/Phoenix", elevationFt: 1135 },
  { icao: "KMSP", iata: "MSP", name: "Minneapolis–Saint Paul", city: "Minneapolis", country: "United States", lat: 44.8848, lon: -93.2223, timezone: "America/Chicago", elevationFt: 841 },
  { icao: "KDTW", iata: "DTW", name: "Detroit Metro", city: "Detroit", country: "United States", lat: 42.2162, lon: -83.3554, timezone: "America/Detroit", elevationFt: 645 },
  { icao: "KPHL", iata: "PHL", name: "Philadelphia International", city: "Philadelphia", country: "United States", lat: 39.8721, lon: -75.2411, timezone: "America/New_York", elevationFt: 36 },
  { icao: "KIAD", iata: "IAD", name: "Washington Dulles", city: "Washington", country: "United States", lat: 38.9531, lon: -77.4565, timezone: "America/New_York", elevationFt: 313 },
  { icao: "CYYZ", iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada", lat: 43.6777, lon: -79.6248, timezone: "America/Toronto", elevationFt: 569 },
  { icao: "CYVR", iata: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canada", lat: 49.1947, lon: -123.179, timezone: "America/Vancouver", elevationFt: 14 },
  { icao: "CYUL", iata: "YUL", name: "Montréal–Trudeau", city: "Montreal", country: "Canada", lat: 45.4706, lon: -73.7408, timezone: "America/Toronto", elevationFt: 118 },
  { icao: "CYYC", iata: "YYC", name: "Calgary International", city: "Calgary", country: "Canada", lat: 51.1215, lon: -114.008, timezone: "America/Edmonton", elevationFt: 3557 },
  { icao: "MMMX", iata: "MEX", name: "Mexico City International", city: "Mexico City", country: "Mexico", lat: 19.4361, lon: -99.0719, timezone: "America/Mexico_City", elevationFt: 7316 },
  { icao: "MMUN", iata: "CUN", name: "Cancún International", city: "Cancún", country: "Mexico", lat: 21.0365, lon: -86.8771, timezone: "America/Cancun", elevationFt: 22 },

  // Latin America / Caribbean
  { icao: "SBGR", iata: "GRU", name: "São Paulo Guarulhos", city: "São Paulo", country: "Brazil", lat: -23.4356, lon: -46.4731, timezone: "America/Sao_Paulo", elevationFt: 2459 },
  { icao: "SBGL", iata: "GIG", name: "Rio de Janeiro Galeão", city: "Rio de Janeiro", country: "Brazil", lat: -22.809, lon: -43.2506, timezone: "America/Sao_Paulo", elevationFt: 28 },
  { icao: "SAEZ", iata: "EZE", name: "Buenos Aires Ezeiza", city: "Buenos Aires", country: "Argentina", lat: -34.8222, lon: -58.5358, timezone: "America/Argentina/Buenos_Aires", elevationFt: 67 },
  { icao: "SCEL", iata: "SCL", name: "Santiago Arturo Merino Benítez", city: "Santiago", country: "Chile", lat: -33.393, lon: -70.7858, timezone: "America/Santiago", elevationFt: 1555 },
  { icao: "SKBO", iata: "BOG", name: "El Dorado International", city: "Bogotá", country: "Colombia", lat: 4.7016, lon: -74.1469, timezone: "America/Bogota", elevationFt: 8361 },
  { icao: "SPJC", iata: "LIM", name: "Jorge Chávez International", city: "Lima", country: "Peru", lat: -12.0219, lon: -77.1143, timezone: "America/Lima", elevationFt: 113 },
  { icao: "SEQM", iata: "UIO", name: "Quito Mariscal Sucre", city: "Quito", country: "Ecuador", lat: -0.125, lon: -78.354, timezone: "America/Guayaquil", elevationFt: 7841 },
  { icao: "SVMI", iata: "CCS", name: "Simón Bolívar International", city: "Caracas", country: "Venezuela", lat: 10.6012, lon: -66.9912, timezone: "America/Caracas", elevationFt: 235 },
  { icao: "MUHA", iata: "HAV", name: "José Martí International", city: "Havana", country: "Cuba", lat: 22.9892, lon: -82.4091, timezone: "America/Havana", elevationFt: 210 },
  { icao: "TNCM", iata: "SXM", name: "Princess Juliana", city: "St. Maarten", country: "Sint Maarten", lat: 18.041, lon: -63.109, timezone: "America/Lower_Princes", elevationFt: 13 },
];

const byIcao = new Map(MAJOR_AIRPORTS.map((a) => [a.icao.toUpperCase(), a]));
const byIata = new Map(
  MAJOR_AIRPORTS.filter((a) => a.iata).map((a) => [a.iata!.toUpperCase(), a])
);

export function findMajorAirport(code: string): MajorAirport | null {
  const upper = code.trim().toUpperCase();
  return byIcao.get(upper) ?? byIata.get(upper) ?? null;
}

export function listMajorAirports(): MajorAirport[] {
  return MAJOR_AIRPORTS;
}
