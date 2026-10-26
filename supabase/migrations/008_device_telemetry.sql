-- Migration: 008_device_telemetry.sql
-- Description:
--   * Device tokens let an inverter, data logger or home-automation hub push daily generation
--     to POST /api/telemetry without a browser session. Only a SHA-256 hash of each token is stored.
--   * ingest_device_readings() is the single, narrowly scoped write path for those devices.
--   * match_document_chunks runs as SECURITY INVOKER (published documents are already readable
--     through RLS), and ml_datasets metadata is visible only to its owner.

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  token_hash    TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  token_prefix  TEXT NOT NULL,
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens (user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_select_own" ON public.device_tokens FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "device_tokens_insert_own" ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "device_tokens_update_own" ON public.device_tokens FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "device_tokens_delete_own" ON public.device_tokens FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- Writes daily generation for the token's owner. Callable with the anon key, but useless without a
-- valid, unrevoked 256-bit token. Returns the number of days written.
CREATE OR REPLACE FUNCTION public.ingest_device_readings(p_token_hash TEXT, p_readings JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token   public.device_tokens%ROWTYPE;
  v_system  UUID;
  v_count   INTEGER;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_token FROM public.device_tokens
   WHERE token_hash = p_token_hash AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;

  IF jsonb_typeof(p_readings) <> 'array' OR jsonb_array_length(p_readings) = 0
     OR jsonb_array_length(p_readings) > 400 THEN
    RAISE EXCEPTION 'readings must be an array of 1-400 items' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_system FROM public.solar_systems
   WHERE user_id = v_token.user_id AND system_status IN ('installed', 'active')
   ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.solar_generation_history AS g (
    user_id, system_id, record_date, generation_kwh, exported_kwh, self_consumed_kwh,
    grid_import_kwh, peak_generation_kw, source
  )
  SELECT v_token.user_id, v_system, r.record_date, r.generation_kwh, COALESCE(r.exported_kwh, 0),
         GREATEST(0, r.generation_kwh - COALESCE(r.exported_kwh, 0)), COALESCE(r.grid_import_kwh, 0), r.peak_kw,
         'inverter_telemetry'
    FROM jsonb_to_recordset(p_readings) AS r(
      record_date DATE, generation_kwh NUMERIC, exported_kwh NUMERIC,
      grid_import_kwh NUMERIC, peak_kw NUMERIC)
   WHERE r.record_date IS NOT NULL
     AND r.record_date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
     AND r.generation_kwh BETWEEN 0 AND 5000
  ON CONFLICT (user_id, record_date) DO UPDATE SET
    generation_kwh     = EXCLUDED.generation_kwh,
    exported_kwh       = EXCLUDED.exported_kwh,
    self_consumed_kwh  = EXCLUDED.self_consumed_kwh,
    grid_import_kwh    = EXCLUDED.grid_import_kwh,
    peak_generation_kw = EXCLUDED.peak_generation_kw,
    system_id          = EXCLUDED.system_id,
    source             = EXCLUDED.source;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.device_tokens SET last_used_at = NOW() WHERE id = v_token.id;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_device_readings(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_device_readings(TEXT, JSONB) TO anon, authenticated;

ALTER FUNCTION public.match_document_chunks(extensions.vector, integer, double precision, text, text, text)
  SECURITY INVOKER;

DROP POLICY IF EXISTS "ml_datasets_read" ON public.ml_datasets;
CREATE POLICY "ml_datasets_read_own" ON public.ml_datasets FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
