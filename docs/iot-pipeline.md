# Device data pipeline

How a reading on a roof becomes a number on the dashboard.

```
Inverter / meter ──> Edge agent ──> POST /api/v1/telemetry ──> ingest_telemetry() ──> telemetry_samples
 (Modbus, MQTT)      (buffer,          (token auth, rate         (validate, dedupe,       (raw, per device)
                      batch, retry)     limit, schema)            update device)                │
                                                                                                 v
 Overview, Energy log, Devices <── solar_generation_history <── rollup_user_day() <── compute_device_day()
                                    (one row per user per day)   (sum devices by kind)   (counters or power)
```

## Input format

Devices send **interval samples**, not daily totals:

| Field | Unit | Notes |
| --- | --- | --- |
| `ts` | ISO-8601 with offset | Required. The sample time on the device. |
| `power_w` | W | Instantaneous AC output. Negative allowed for meters. |
| `energy_wh_total` | Wh | Lifetime generation counter. Preferred: makes daily energy exact even with gaps. |
| `import_wh_total`, `export_wh_total` | Wh | Bidirectional meter counters. |
| `voltage_v`, `frequency_hz`, `temperature_c` | V, Hz, °C | Diagnostics. |
| `status` | text | Device state string. |

Up to 1,000 samples per request; 512 KB body cap. Samples older than 35 days or more than 5 minutes in
the future are rejected (clock-skew guard).

## Guarantees

- **Authentication:** per-device bearer token (`sdt_` + 256 random bits). Only the SHA-256 hash is
  stored. Tokens rotate without re-registering; archiving a device revokes its token.
- **Idempotency:** primary key `(device_id, ts)` with `ON CONFLICT DO NOTHING`. Retries and buffer
  replays never double count. The response reports accepted / duplicates / rejected.
- **Rate limiting:** 120 requests per minute per token (`lib/rate-limit`, policy `telemetry`).
- **Isolation:** the ingest function is `SECURITY DEFINER` and resolves the user from the token, so a
  device can only ever write its owner's data. Users read their samples through RLS.

## Daily energy

`compute_device_day(device, day)` uses the lifetime counter: last value of the day minus the last value
before the day (or the first of the day when there is no earlier sample). Without counters it integrates
power with the trapezoid rule and ignores gaps longer than 30 minutes. `rollup_user_day` sums
inverters/loggers for generation and meters for import/export, caps export at generation, and upserts
`solar_generation_history` with source `inverter_telemetry`. The rollup runs inside every ingest call for
the days the batch touched.

## Device status

`online` within 2 reporting intervals (min 2 min), `delayed` within 6 (min 15 min), else `offline`.
Data completeness = samples received / samples expected since midnight.

## Scaling notes

- `telemetry_samples` is the only high-volume table (288 rows per device per day at 5-minute
  intervals). Its key starts with `device_id` and it is indexed by `(user_id, ts)`, so it can be
  range-partitioned by month on `ts` (pg_partman) without changing queries.
- `prune_telemetry(interval)` deletes raw samples past retention (default 180 days); daily rollups are
  kept forever. Schedule it with pg_cron.
- The live view polls `/api/devices/:id/live?since=<last ts>` every 15 s and pauses in hidden tabs, so
  each poll is a small index range scan. Supabase Realtime can replace polling later.
- At higher volume, put a queue (e.g. Supabase Queues / pgmq, or Kafka) between the API and the ingest
  function and acknowledge after enqueueing.
