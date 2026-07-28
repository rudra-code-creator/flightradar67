# FlightRadar67

Live flight tracking with a CesiumJS globe, Auth.js, Prisma/PostgreSQL/Redis, and real ADS-B data from [adsb.lol](https://adsb.lol) (simulator / OpenSky fallbacks available).

## Stack

- **Next.js 15** App Router + TypeScript + Tailwind CSS + shadcn-style UI
- **CesiumJS** full-screen globe (dynamic import, no SSR)
- **Auth.js v5** — credentials + OAuth-ready Google/GitHub
- **Prisma** + **PostgreSQL** + **Redis** (ioredis, in-memory fallback)
- **TanStack Query** + **Zustand**
- **Recharts** on flight detail & analytics
- **Docker Compose** for app/postgres/redis

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres + Redis)

### 2. Install & env

```bash
npm install
cp .env.example .env
```

Generate a secret:

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Set `AUTH_SECRET` in `.env`. Optional: `CESIUM_ION_TOKEN` / `NEXT_PUBLIC_CESIUM_ION_TOKEN`, `OPENAI_API_KEY`, OAuth keys. Default live feed: `DATA_SOURCE=adsblol`.

### 3. Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Demo user: `demo@flightradar67.com` / `password123`

### 5. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Cesium static assets are copied to `public/cesium` via `scripts/copy-cesium.js` (also on `postinstall`).

## Docker (full stack)

```bash
docker compose up --build
```

App: `http://localhost:3000` · Postgres `5432` · Redis `6379`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev (Turbopack) |
| `npm run build` | Prisma generate + production build |
| `npm start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Seed airports/airlines/demo user |
| `npm run db:push` | Prisma db push |

## Data sources

- **adsb.lol (default)** — `DATA_SOURCE=adsblol` · live ADS-B via [api.adsb.lol](https://api.adsb.lol) (ODbL). Global hub tiles + ~2.5s poll; plane icons color-coded by altitude; click an aircraft for its recent trail. SSE at `/api/stream/flights`.
- **OpenSky** — `DATA_SOURCE=opensky` · REST `states/all`, falls back to simulator on failure.
- **Simulator** — `DATA_SOURCE=simulator` · synthetic fleet for offline demos (`SIMULATOR_AIRCRAFT_COUNT`).

Attribution: [adsb.lol](https://adsb.lol) (ODbL), [OpenSky Network](https://opensky-network.org/).

## Cesium notes

- Assets served from `/cesium` (Workers, Assets, Widgets).
- Without an Ion token, the map uses OpenStreetMap raster tiles.
- Set `NEXT_PUBLIC_CESIUM_ION_TOKEN` (and optionally `CESIUM_ION_TOKEN`) for Ion imagery/terrain.

## Features map

| Area | Route / API |
| --- | --- |
| Live globe | `/` |
| Flight detail + charts + playback scrubber | `/flight/[id]` |
| Airport boards + weather | `/airport/[code]` |
| Analytics | `/analytics` |
| Auth / favourites | `/login`, `/profile` |
| RadarAI | FAB on map · `POST /api/ai/chat` |
| Flights / search / stats / SSE | `/api/flights`, `/api/search`, `/api/statistics`, `/api/stream/flights` |

## Performance (dense markers)

- Billboard canvas icons with heading rotation
- Viewport downsample when zoomed out (`clusterWhenZoomedOut`)
- Label budget + distance display conditions
- Client interpolation between SSE ticks
- Redis (or memory) cache on `/api/flights` and `/api/statistics`

## License

MIT — demo/educational use. Not affiliated with Flightradar24.
