-- Migration: 006_generation_unique_and_provenance.sql
-- Description: One generation record per user per day (enables idempotent upserts / CSV re-imports)
-- and removes the demo_seed provenance value so fabricated data can no longer be stored.

DELETE FROM public.solar_generation_history WHERE source = 'demo_seed';
DELETE FROM public.consumption_history WHERE source = 'demo_seed';

ALTER TABLE public.solar_generation_history DROP CONSTRAINT IF EXISTS solar_generation_history_source_check;
ALTER TABLE public.solar_generation_history
  ADD CONSTRAINT solar_generation_history_source_check
  CHECK (source IN ('inverter_telemetry', 'manual_log', 'estimated'));

ALTER TABLE public.consumption_history DROP CONSTRAINT IF EXISTS consumption_history_source_check;
ALTER TABLE public.consumption_history
  ADD CONSTRAINT consumption_history_source_check
  CHECK (source IN ('user_entered', 'bill_import', 'estimated'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_user_date
  ON public.solar_generation_history (user_id, record_date);

CREATE INDEX IF NOT EXISTS idx_consumption_user_date
  ON public.consumption_history (user_id, record_date);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_type_date
  ON public.ml_predictions (user_id, prediction_type, prediction_date);

-- Sanity bounds so bad imports cannot poison analytics.
ALTER TABLE public.solar_generation_history
  ADD CONSTRAINT chk_generation_nonneg CHECK (generation_kwh >= 0 AND exported_kwh >= 0 AND exported_kwh <= generation_kwh + 0.001);
ALTER TABLE public.consumption_history
  ADD CONSTRAINT chk_consumption_nonneg CHECK (consumption_kwh >= 0 AND bill_amount >= 0);
