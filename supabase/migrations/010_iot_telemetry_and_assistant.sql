-- Migration: 010_iot_telemetry_and_assistant.sql
--
-- IoT pipeline
--   devices            one row per physical device (inverter, energy meter, data logger, gateway)
--   device_tokens      gains device_id; every new token belongs to exactly one device
--   telemetry_samples  raw interval samples, idempotent on (device_id, ts)
--   ingest_telemetry() single write path for devices (token-authenticated, SECURITY DEFINER)
--   rollup_user_day()  turns raw samples into the daily solar_generation_history row
--
-- Assistant
--   messages.artifacts   charts/tables attached to an assistant answer
--   messages.suggestions follow-up prompts shown under an answer
--   llm_usage            one row per model call, used for per-user daily budgets
--   assistant_cache      answers keyed by question + context fingerprint
--
-- Scaling notes: telemetry_samples is the only high-volume table. Its primary key starts with
-- device_id and it is indexed by (user_id, ts), so it can later be range-partitioned by month on ts
-- (pg_partman) without changing queries. prune_telemetry() enforces raw-sample retention; daily rollups
-- are kept forever.

-- 1. Devices ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  kind                 TEXT NOT NULL CHECK (kind IN ('inverter', 'energy_meter', 'data_logger', 'gateway')),
  protocol             TEXT NOT NULL DEFAULT 'http' CHECK (protocol IN ('http', 'mqtt', 'modbus_tcp', 'vendor_cloud', 'simulator')),
  vendor               TEXT CHECK (char_length(vendor) <= 60),
  model                TEXT CHECK (char_length(model) <= 60),
  serial_number        TEXT CHECK (char_length(serial_number) <= 80),
  capacity_kw          NUMERIC CHECK (capacity_kw IS NULL OR (capacity_kw > 0 AND capacity_kw <= 1000)),
  reporting_interval_s INTEGER NOT NULL DEFAULT 300 CHECK (reporting_interval_s BETWEEN 10 AND 3600),
  last_seen_at         TIMESTAMPTZ,
  last_power_w         NUMERIC,
  archived_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices (user_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devices_select_own" ON public.devices FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "devices_insert_own" ON public.devices FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "devices_update_own" ON public.devices FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "devices_delete_own" ON public.devices FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

ALTER TABLE public.device_tokens ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON public.device_tokens (device_id);

-- 2. Raw samples --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetry_samples (
  device_id        UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ts               TIMESTAMPTZ NOT NULL,
  power_w          NUMERIC CHECK (power_w IS NULL OR power_w BETWEEN -1000000 AND 1000000),
  energy_wh_total  NUMERIC CHECK (energy_wh_total IS NULL OR energy_wh_total >= 0),
  import_wh_total  NUMERIC CHECK (import_wh_total IS NULL OR import_wh_total >= 0),
  export_wh_total  NUMERIC CHECK (export_wh_total IS NULL OR export_wh_total >= 0),
  voltage_v        NUMERIC CHECK (voltage_v IS NULL OR voltage_v BETWEEN 0 AND 1000),
  frequency_hz     NUMERIC CHECK (frequency_hz IS NULL OR frequency_hz BETWEEN 0 AND 100),
  temperature_c    NUMERIC CHECK (temperature_c IS NULL OR temperature_c BETWEEN -50 AND 150),
  status           TEXT CHECK (char_length(status) <= 40),
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id, ts)
);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_ts ON public.telemetry_samples (user_id, ts DESC);

ALTER TABLE public.telemetry_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_select_own" ON public.telemetry_samples FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- 3. Daily rollup -------------------------------------------------------------------------------------
-- Energy for one device on one local day. Prefers the lifetime counters (robust to missed samples);
-- falls back to trapezoidal integration of power, ignoring gaps longer than 30 minutes.
CREATE OR REPLACE FUNCTION public.compute_device_day(p_device UUID, p_day DATE)
RETURNS TABLE (generation_wh NUMERIC, import_wh NUMERIC, export_wh NUMERIC, peak_w NUMERIC, samples INTEGER)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_start TIMESTAMPTZ := (p_day::timestamp AT TIME ZONE 'Asia/Kolkata');
  v_end   TIMESTAMPTZ := ((p_day + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');
BEGIN
  RETURN QUERY
  WITH day AS (
    SELECT s.ts, s.power_w, s.energy_wh_total, s.import_wh_total, s.export_wh_total
      FROM public.telemetry_samples s
     WHERE s.device_id = p_device AND s.ts >= v_start AND s.ts < v_end
  ),
  base AS (
    -- Last counter values before the day starts give an exact baseline when available.
    SELECT
      (SELECT s.energy_wh_total FROM public.telemetry_samples s WHERE s.device_id = p_device AND s.ts < v_start AND s.energy_wh_total IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS e0,
      (SELECT s.import_wh_total FROM public.telemetry_samples s WHERE s.device_id = p_device AND s.ts < v_start AND s.import_wh_total IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS i0,
      (SELECT s.export_wh_total FROM public.telemetry_samples s WHERE s.device_id = p_device AND s.ts < v_start AND s.export_wh_total IS NOT NULL ORDER BY s.ts DESC LIMIT 1) AS x0
  ),
  counters AS (
    SELECT
      MAX(d.energy_wh_total) - COALESCE((SELECT e0 FROM base), MIN(d.energy_wh_total)) AS gen_counter,
      MAX(d.import_wh_total) - COALESCE((SELECT i0 FROM base), MIN(d.import_wh_total)) AS imp,
      MAX(d.export_wh_total) - COALESCE((SELECT x0 FROM base), MIN(d.export_wh_total)) AS exp,
      MAX(d.power_w) AS peak,
      COUNT(*)::INTEGER AS n
    FROM day d
  ),
  integrated AS (
    SELECT COALESCE(SUM(
      CASE WHEN EXTRACT(EPOCH FROM (t.ts - t.prev_ts)) <= 1800
           THEN GREATEST(0, (t.power_w + t.prev_p) / 2) * EXTRACT(EPOCH FROM (t.ts - t.prev_ts)) / 3600
           ELSE 0 END), 0) AS gen_integrated
    FROM (
      SELECT d.ts, d.power_w, LAG(d.ts) OVER (ORDER BY d.ts) AS prev_ts, LAG(d.power_w) OVER (ORDER BY d.ts) AS prev_p
        FROM day d WHERE d.power_w IS NOT NULL
    ) t
    WHERE t.prev_ts IS NOT NULL
  )
  SELECT
    GREATEST(0, COALESCE(c.gen_counter, i.gen_integrated)),
    GREATEST(0, c.imp),
    GREATEST(0, c.exp),
    c.peak,
    c.n
  FROM counters c CROSS JOIN integrated i;
END;
$$;

-- Aggregates every device of a user for one local day into solar_generation_history.
-- Generation comes from inverters/loggers; import/export from energy meters (or the inverter's meter).
CREATE OR REPLACE FUNCTION public.rollup_user_day(p_user UUID, p_day DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_gen NUMERIC := 0; v_imp NUMERIC; v_exp NUMERIC; v_peak NUMERIC; v_any BOOLEAN := FALSE;
  r RECORD; d RECORD;
BEGIN
  FOR d IN SELECT id, kind FROM public.devices WHERE user_id = p_user AND archived_at IS NULL LOOP
    SELECT * INTO r FROM public.compute_device_day(d.id, p_day);
    IF r.samples IS NULL OR r.samples = 0 THEN CONTINUE; END IF;
    v_any := TRUE;
    IF d.kind IN ('inverter', 'data_logger', 'gateway') THEN
      v_gen := v_gen + COALESCE(r.generation_wh, 0);
      v_peak := GREATEST(COALESCE(v_peak, 0), COALESCE(r.peak_w, 0));
    END IF;
    IF r.import_wh IS NOT NULL THEN v_imp := COALESCE(v_imp, 0) + r.import_wh; END IF;
    IF r.export_wh IS NOT NULL THEN v_exp := COALESCE(v_exp, 0) + r.export_wh; END IF;
  END LOOP;

  IF NOT v_any THEN RETURN; END IF;
  v_exp := LEAST(COALESCE(v_exp, 0), v_gen);

  INSERT INTO public.solar_generation_history (
    user_id, record_date, generation_kwh, exported_kwh, self_consumed_kwh, grid_import_kwh, peak_generation_kw, source
  ) VALUES (
    p_user, p_day, ROUND(v_gen / 1000, 3), ROUND(v_exp / 1000, 3), ROUND(GREATEST(0, v_gen - v_exp) / 1000, 3),
    ROUND(COALESCE(v_imp, 0) / 1000, 3), ROUND(v_peak / 1000, 3), 'inverter_telemetry'
  )
  ON CONFLICT (user_id, record_date) DO UPDATE SET
    generation_kwh = EXCLUDED.generation_kwh,
    exported_kwh = EXCLUDED.exported_kwh,
    self_consumed_kwh = EXCLUDED.self_consumed_kwh,
    grid_import_kwh = EXCLUDED.grid_import_kwh,
    peak_generation_kw = EXCLUDED.peak_generation_kw,
    source = EXCLUDED.source;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.rollup_user_day(UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_device_day(UUID, DATE) FROM PUBLIC, anon;

-- 4. Ingest -------------------------------------------------------------------------------------------
-- Accepts up to 1,000 samples per call. Duplicates (same device + timestamp) are ignored, so devices can
-- retry safely. Samples older than 35 days or more than 5 minutes in the future are rejected.
CREATE OR REPLACE FUNCTION public.ingest_telemetry(p_token_hash TEXT, p_samples JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token  public.device_tokens%ROWTYPE;
  v_device public.devices%ROWTYPE;
  v_total INTEGER; v_valid INTEGER; v_inserted INTEGER;
  v_day DATE;
  v_days DATE[];
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_token FROM public.device_tokens WHERE token_hash = p_token_hash AND revoked_at IS NULL;
  IF NOT FOUND OR v_token.device_id IS NULL THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO v_device FROM public.devices WHERE id = v_token.device_id AND archived_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'device archived' USING ERRCODE = '28000';
  END IF;

  IF jsonb_typeof(p_samples) <> 'array' THEN
    RAISE EXCEPTION 'samples must be an array' USING ERRCODE = '22023';
  END IF;
  v_total := jsonb_array_length(p_samples);
  IF v_total = 0 OR v_total > 1000 THEN
    RAISE EXCEPTION 'samples must contain 1-1000 items' USING ERRCODE = '22023';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.incoming (LIKE public.telemetry_samples INCLUDING DEFAULTS) ON COMMIT DROP;
  TRUNCATE pg_temp.incoming;
  INSERT INTO pg_temp.incoming (device_id, user_id, ts, power_w, energy_wh_total, import_wh_total, export_wh_total, voltage_v, frequency_hz, temperature_c, status)
  SELECT DISTINCT ON (r.ts) v_device.id, v_device.user_id, r.ts, r.power_w, r.energy_wh_total, r.import_wh_total, r.export_wh_total,
         r.voltage_v, r.frequency_hz, r.temperature_c, LEFT(r.status, 40)
    FROM jsonb_to_recordset(p_samples) AS r(
      ts TIMESTAMPTZ, power_w NUMERIC, energy_wh_total NUMERIC, import_wh_total NUMERIC, export_wh_total NUMERIC,
      voltage_v NUMERIC, frequency_hz NUMERIC, temperature_c NUMERIC, status TEXT)
   WHERE r.ts IS NOT NULL
     AND r.ts > NOW() - INTERVAL '35 days'
     AND r.ts < NOW() + INTERVAL '5 minutes'
     AND (r.power_w IS NULL OR r.power_w BETWEEN -1000000 AND 1000000)
     AND (r.energy_wh_total IS NULL OR r.energy_wh_total >= 0)
   ORDER BY r.ts;
  GET DIAGNOSTICS v_valid = ROW_COUNT;

  INSERT INTO public.telemetry_samples (device_id, user_id, ts, power_w, energy_wh_total, import_wh_total, export_wh_total, voltage_v, frequency_hz, temperature_c, status)
  SELECT device_id, user_id, ts, power_w, energy_wh_total, import_wh_total, export_wh_total, voltage_v, frequency_hz, temperature_c, status
    FROM pg_temp.incoming
  ON CONFLICT (device_id, ts) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.devices d SET
    last_seen_at = GREATEST(COALESCE(d.last_seen_at, '-infinity'), latest.ts),
    last_power_w = CASE WHEN latest.ts >= COALESCE(d.last_seen_at, '-infinity') THEN latest.power_w ELSE d.last_power_w END,
    updated_at = NOW()
  FROM (SELECT ts, power_w FROM pg_temp.incoming ORDER BY ts DESC LIMIT 1) latest
  WHERE d.id = v_device.id;

  UPDATE public.device_tokens SET last_used_at = NOW() WHERE id = v_token.id;

  SELECT ARRAY_AGG(DISTINCT (ts AT TIME ZONE 'Asia/Kolkata')::date) INTO v_days FROM pg_temp.incoming;
  IF v_inserted > 0 AND v_days IS NOT NULL THEN
    FOREACH v_day IN ARRAY v_days LOOP
      PERFORM public.rollup_user_day(v_device.user_id, v_day);
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'received', v_total,
    'accepted', v_inserted,
    'duplicates', v_valid - v_inserted,
    'rejected', v_total - v_valid,
    'days_updated', COALESCE(array_length(v_days, 1), 0)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ingest_telemetry(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_telemetry(TEXT, JSONB) TO anon, authenticated;

-- Raw-sample retention (call from a scheduled job, e.g. pg_cron daily). Rollups are untouched.
CREATE OR REPLACE FUNCTION public.prune_telemetry(p_keep INTERVAL DEFAULT INTERVAL '180 days')
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH d AS (DELETE FROM public.telemetry_samples WHERE ts < NOW() - p_keep RETURNING 1) SELECT COUNT(*) FROM d;
$$;
REVOKE EXECUTE ON FUNCTION public.prune_telemetry(INTERVAL) FROM PUBLIC, anon, authenticated;

-- 5. Assistant ----------------------------------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS artifacts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS suggestions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.llm_usage (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model          TEXT NOT NULL,
  purpose        TEXT NOT NULL DEFAULT 'answer',
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  latency_ms     INTEGER,
  outcome        TEXT NOT NULL CHECK (outcome IN ('ok', 'error', 'timeout')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created ON public.llm_usage (user_id, created_at DESC);
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "llm_usage_select_own" ON public.llm_usage FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "llm_usage_insert_own" ON public.llm_usage FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.assistant_cache (
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key   TEXT NOT NULL CHECK (cache_key ~ '^[0-9a-f]{64}$'),
  answer      TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  hits        INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, cache_key)
);
CREATE INDEX IF NOT EXISTS idx_assistant_cache_expires ON public.assistant_cache (expires_at);
ALTER TABLE public.assistant_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assistant_cache_own" ON public.assistant_cache FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
