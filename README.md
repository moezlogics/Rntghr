# Rent Ghar (rentghar.pk)

Pakistan's rentals-only property portal: houses, upper and lower portions,
flats, rooms, hostels, shops, offices and warehouses **for rent**, with direct
contact to landlords and dealers.

A Turborepo monorepo:

| Path | What |
| --- | --- |
| `apps/web` | Next.js 16 site + admin dashboard (`/dashboard`) |
| `apps/api` | NestJS + Mongoose API (mounted under `/api`) |
| `packages/db` | Shared Mongoose schemas (`src/*.ts`) |
| `packages/dtos` | Shared DTOs for cities and areas |
| `scripts/seed-local.js` | Local admin + starter cities/areas |

## Rental types

`house`, `upper-portion`, `lower-portion`, `flat`, `apartment`, `room`,
`hostel`, `shop`, `office`, `warehouse`, `commercial`. Every listing is
`listingType: "rent"`; the API rejects anything else.

## Run it locally

Needs Node 20+ and a local MongoDB (the Windows "MongoDB" service, or
`docker run -d -p 27017:27017 mongo:7`).

```bash
npm ci
npm run seed:local                      # local admin + cities/areas (refuses non-local DBs)
NODE_OPTIONS=--max-old-space-size=6144 npm run build   # always from the root
npm run start --workspace=apps/api      # API on http://localhost:3105
npm run start --workspace=apps/web -- -p 3100           # site on http://localhost:3100
```

Or in development mode: `npm run dev` (API 3105 with watch, web 3100).

The local admin's email and password are in `scripts/seed-local.js`
(`LOCAL_ADMIN`). After signing in once, seed the plans from the dashboard
session or with `npm run seed:packages` while signed in as admin.

## Configuration

- `apps/api/.env` — see `apps/api/.env.example`. Local default:
  `MONGODB_URI=mongodb://localhost:27017/rentghar`, `PORT=3105`.
- `apps/web/.env.local` — see `apps/web/.env.example`. Local default:
  `NEXT_PUBLIC_API_URL=http://localhost:3105`, `NEXT_PUBLIC_BASE_URL=http://localhost:3100`.
- `apps/web/.env.production` — public production values (`https://rentghar.pk`).

Optional features stay off until their keys are added: Google sign-in,
OpenAI (image alt text, listing checker's AI opinion, site assistant),
Discord alerts, Redis cache, IndexNow, AdSense, Google Analytics.

## Production (PM2)

`ecosystem.config.js` runs the API on port 5100 and the web on 3110, so it can
share a server with other sites. Point Nginx at the web port and proxy `/api`,
`/uploads` and `/img` to the API, or let Next's rewrites do it.

## SEO

- Search pages: `/properties/rent[/city][/area][/type][/10marla]`
  (`/properties` and old `/properties/all/...` addresses redirect there).
- Listing pages: `/properties/<slug>` with `RealEstateListing` + monthly
  `UnitPriceSpecification` structured data.
- Sitemaps: `/sitemap.xml` → pages, properties, areas, blogs. `robots.txt`
  points to it.
