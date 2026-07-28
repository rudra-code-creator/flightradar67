## Learned User Preferences

- Prefer CesiumJS for the map (not Mapbox) and Auth.js / NextAuth for authentication.
- Use a dark aviation theme (deep navy/charcoal with cyan/amber accents); avoid purple gradients.
- Aircraft markers should be plane-shaped and colour-coded by altitude; clicking an aircraft should show the path flown so far.
- Load live traffic in viewport chunks rather than the whole world at once; do not show antipodal aircraft or airport markers on the far side of the globe for the current camera view.
- Flight info panels should include route details (departure and arrival airports), not only position/speed basics; selected aircraft identity/route must stay stable and not jump to unrelated flights.
- Aircraft type filter (all / commercial / cargo / private) should actually filter visible traffic.
- Airport search (e.g. SIN) should fly the map to that airport and show an info popup; open the arrivals/departures board only on demand, not by default.
- Major airports should have clickable map pin markers that show airport details and a link to that airport’s arrivals/departures board.
- Aircraft markers should update smoothly without blinking or disappearing on each data refresh.
- Clicked flight trails should show the full flown path from departure when history exists, drawn clearly/thickly, preferring real ADS-B track geometry over a straight great-circle.
- Do not create git commits unless explicitly asked.

## Learned Workspace Facts

- FlightRadar67 is a Next.js 15 App Router flight-tracking MVP with TypeScript, Tailwind, shadcn/ui, React Query, Zustand, Prisma, PostgreSQL, Redis, and Docker Compose.
- The globe map is CesiumJS, loaded client-only (dynamic import, no SSR); Cesium static assets are served from `/cesium` via `scripts/copy-cesium.js` (also on postinstall).
- Default live aircraft source is adsb.lol (`DATA_SOURCE=adsblol` → `https://api.adsb.lol`); simulator and OpenSky remain available as fallbacks.
- Auth is Auth.js v5 (Credentials plus OAuth-ready Google/GitHub) with the Prisma adapter.
- Local Postgres and Redis are provided by `docker-compose.yml` (Postgres DB `flightradar67`).
- Flight stream endpoint is SSE at `/api/stream/flights`.
- Airport UX includes map fly-to/search popups and a per-airport arrivals/departures board opened on demand (not shown by default).
