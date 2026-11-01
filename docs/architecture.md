# Architecture

Next.js 16 App Router (server components and server actions) on Supabase Postgres with RLS. Every number shown
comes from a deterministic calculator or the user's own records; the language model only writes prose around
tool outputs and transcribes uploaded documents.

```
Browser ──► proxy.ts (session gate) ──► app/(app)/*  pages (server components)
                                        actions/*    server actions (zod-validated)
                                        app/api/*    route handlers (rate-limited)
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
                    ▼                         ▼                          ▼
            lib/calculations          lib/agent (assistant)        lib/billing
            lib/solar, lib/ml         planner → executor →         ledger, reconcile,
            (tariffs, PV model,       LLM → verifier/guardrails    quote, documents
             calibration, sizing)                                  (bill and quote checks)
                    └─────────────────────────┼──────────────────────────┘
                                              ▼
                                  lib/dal (server-only, RLS)
                                              ▼
                              Supabase Postgres + pgvector
```

## Layers

| Area | Files | Notes |
| --- | --- | --- |
| Routing and auth | `proxy.ts`, `lib/auth/session.ts` | `proxy.ts` replaces `middleware.ts` in Next 16. |
| Data access | `lib/dal/*` | The only code that queries Supabase. Every query is scoped to the signed-in user, and RLS enforces it again. |
| Tariffs and finance | `lib/calculations/*` | LT-I slabs, fixed charge, PM Surya Ghar subsidy, payback and cashflow. |
| Generation | `lib/solar/pvModel.ts`, `lib/solar/calibration.ts`, `lib/ml/*` | Physics model driven by Open-Meteo, a per-user calibration factor, and monthly climatology. |
| Devices | `app/api/telemetry`, `app/api/v1/telemetry`, `lib/iot`, `edge/` | Token-authenticated ingestion. See `iot-pipeline.md`. |
| Assistant | `lib/agent/*`, `app/api/chat` | Deterministic planner, tools, guardrails, cache and daily budget. See `assistant.md`. |
| Knowledge | `lib/rag/*`, `lib/ai/embeddings.ts` | pgvector retrieval with citations and a retrieval benchmark. |
| Rate limits | `lib/rate-limit` | One policy table. See `rate-limiting.md`. |

## Bills and net metering (`lib/billing`)

- **Settlement ledger** (`ledger.ts`, `overview.ts`)
  - The settlement year runs from April to 31 March, in IST.
  - Each month's net is import minus export:
    - A net export is banked.
    - A net import draws on the bank first; only the remainder is billed.
  - On 31 March the remaining balance is paid out at APPC (₹5.33/kWh) and the bank resets to zero.
  - Where each month's figures come from, in order of priority:
    1. A saved bill. Its printed closing balance always wins.
    2. Logged meter days (at least 25 days in that month).
    3. A forecast: last year's consumption for the same month, minus calibrated climatology generation.
  - Forecast months are marked as such on the chart, in the table and in assistant answers.
- **Bill check** (`documents.ts`, `app/api/documents/extract`, `reconcile.ts`, `actions/bills.ts`)
  - The user uploads a PDF or photo of the bill.
  - Gemini transcribes it into a JSON schema at temperature 0. The file is not stored, and no personal details are requested.
  - The user reviews and corrects the extracted fields, then saves.
  - The saved bill is checked for:
    - its own net arithmetic,
    - continuity of the credit balance from the previous bill,
    - slab energy charges, scaled to the length of the period,
    - the fixed charge for the sanctioned load,
    - the total,
    - import and export against the logged meter data (at least 80% coverage required).
  - Each check returns `ok`, `warn`, `fail` or `skipped`, with the reason.
- **Quote check** (`quote.ts`, `components/billing/QuoteChecker.tsx`)
  - The user enters the installer's quote, or extracts it from the document, on the Planner page.
  - The quote is checked for:
    - capacity arithmetic,
    - the stated subsidy against the MNRE formula,
    - DCR modules (required for the subsidy),
    - price per kW against the market estimate,
    - the inverter's DC/AC ratio,
    - size against the sanctioned load and the recommended size,
    - whether the net meter is included.
  - Quotes are not stored.

Document extraction shares the assistant's daily model budget (`llm_usage`) and has its own limit of
10 uploads per hour.

## Database

Migrations live in `supabase/migrations` and are applied in order.

- **001–011:** applied. 011 adds the net-metering columns, a period check and a unique period per user to
  `electricity_bills`.
- **012:** not applied yet. It drops four unused, empty tables: `recommendation_history`, `saved_scenarios`,
  `dashboard_preferences` and `tariff_history`.
