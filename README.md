# Solar Intelligence Platform

Next.js 16 + Supabase app that helps Telangana households size, price and monitor rooftop solar.

## Where the numbers come from

Nothing on the dashboard is hard-coded or randomly generated.

| Figure | Source |
| --- | --- |
| Hourly output / today's kWh | Physics PV model (`lib/solar/pvModel.ts`) driven by live plane-of-array irradiance and temperature from [Open-Meteo](https://open-meteo.com) for your city. Labelled "modelled". |
| Logged generation, exports, imports | Entered by you (form or CSV) on **History**, or pushed by your inverter/logger to `POST /api/telemetry` → `solar_generation_history`. |
| Consumption, bills, tariff | Entered by you / CSV → `consumption_history`. Tariff = profile value, else bill-derived, else the marginal LT-I slab rate. |
| LT-I tariff slabs | TGSPDCL schedule FY 2025-26, retained for FY 2026-27 (`lib/calculations/tariffs.ts`). Excludes electricity duty, FSA and ToD. |
| Net-metering export credit | TGERC APPC FY 2025-26, ₹5.330/kWh. |
| PM Surya Ghar subsidy | MNRE: ₹30k/kW for the first 2 kW + ₹18k for the 3rd kW, capped at ₹78k (pro-rated). |
| Monthly climatology (Studio, chat, ML export) | ERA5 reanalysis via Open-Meteo archive (3-year mean). |
| Forecast metrics (MAE/RMSE/R²) | Computed from real `ml_predictions` prediction/actual pairs only. |
| Regulations / subsidy answers | RAG over ingested TGERC / TGREDCO / MNRE documents with citations. |

When data is missing the UI says so (empty states, `—`) instead of substituting defaults.

## Setup

```bash
cp .env.example .env.local   # fill in Supabase + GEMINI_API_KEY
npm install
npm run dev
```

Apply `supabase/migrations/*.sql` in order (001–008). Run `npm run ingest:knowledge` once to load the knowledge base.

## Scripts

`npm run dev | build | start | lint | test | test:coverage`

## Operations

- `GET /api/health` returns 200 / 503 with a database check (use for uptime monitors).
- All data APIs require a session and return `Cache-Control: private, no-store`.
- `POST /api/chat` requires sign-in, caps messages at 2000 chars and is rate-limited to 20/min/user
  (global via Upstash Redis when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are set; otherwise per instance).
- `proxy.ts` (Next 16 successor to `middleware.ts`) gates app routes; security headers are set in `next.config.ts`.
- Device telemetry: create a token under **Profile → Connected devices**, then
  `POST /api/telemetry` with `Authorization: Bearer sdt_…` and
  `{"readings":[{"date":"YYYY-MM-DD","generation_kwh":14.2,"exported_kwh":6.1,"grid_import_kwh":2}]}`
  (≤400 days per call, 60 calls/min per token; send the cumulative daily total, re-sending a day overwrites it).
  Only a SHA-256 hash of each token is stored; tokens can be revoked at any time.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and a production build on every push/PR.
- Enable **Leaked password protection** in Supabase → Authentication → Settings (the one advisor warning left).
- `GET /api/ml/dataset` exports the user's real history for the external Python pipeline — see `docs/ml-integration.md`.

## Known limitations

- "Current power" is a weather-model estimate; telemetry is daily totals. Vendor clouds (SolarEdge, Growatt, etc.)
  need a small bridge script or Home Assistant automation that posts to `/api/telemetry`.
- The knowledge-base documents in `data/knowledge/` are unofficial summaries (labelled as such in titles and text).
  Replace them with the official PDFs via `npm run ingest:knowledge` for verbatim citations.
- Tariff, APPC and subsidy constants are coded from the sources above and must be updated when TGERC issues a new
  order or MNRE amends the scheme. Installed cost (₹62,000/kW, `SOLAR_COST_PER_KW_INR`) is a market estimate.
- The Analysis Studio is a what-if simulator: its inputs start from your profile (or generic examples if you have none).
  It uses measured climatology from `/api/climate`, falling back to a built-in reference table only if that fails.
- `public.regional_statistics` is intentionally empty; populate it only from a cited official source.
