# Solar Intelligence Platform

Next.js 16 + Supabase app that helps Telangana households size, price and monitor rooftop solar.

## Where the numbers come from

Nothing on the dashboard is hard-coded or randomly generated.

| Figure | Source |
| --- | --- |
| Hourly output / today's kWh | Physics PV model (`lib/solar/pvModel.ts`) driven by live plane-of-array irradiance and temperature from [Open-Meteo](https://open-meteo.com) for your city. Labelled "modelled". |
| Logged generation, exports, imports | Entered by you (form or CSV) on **History** → `solar_generation_history`. |
| Consumption, bills, tariff | Entered by you / CSV → `consumption_history`. Tariff = profile value, else bill-derived, else the slab model. |
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

Apply `supabase/migrations/*.sql` in order (001–006). Run `npm run ingest:knowledge` once to load the knowledge base.

## Scripts

`npm run dev | build | start | lint | test | test:coverage`

## Operations

- `GET /api/health` returns 200 / 503 with a database check (use for uptime monitors).
- All data APIs require a session and return `Cache-Control: private, no-store`.
- `POST /api/chat` requires sign-in, caps messages at 2000 chars and is rate-limited to 20/min/user
  (in-memory per instance; replace `lib/rate-limit.ts` with a Redis store for a global limit).
- `proxy.ts` (Next 16 successor to `middleware.ts`) gates app routes; security headers are set in `next.config.ts`.
- `GET /api/ml/dataset` exports the user's real history for the external Python pipeline — see `docs/ml-integration.md`.

## Known limitations

- Live inverter telemetry is not integrated; "current power" is a weather-model estimate. Connect an inverter API
  (e.g. via `upsertGenerationRecords(..., 'inverter_telemetry')`) to replace manual logs.
- Telangana tariff slabs in `lib/calculations/tariffs.ts` and PM Surya Ghar subsidy tiers in `systemSizing.ts` are
  coded constants; verify against the current TGERC order and MNRE circular before relying on quotes.
- The Analysis Studio is a what-if simulator: its inputs start from your profile (or generic examples if you have none).
  It uses measured climatology from `/api/climate`, falling back to a built-in reference table only if that fails.
- `public.regional_statistics` is intentionally empty; populate it only from a cited official source.
