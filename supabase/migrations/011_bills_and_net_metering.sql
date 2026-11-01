-- Migration: 011_bills_and_net_metering.sql
-- Description: electricity_bills becomes the source of truth for billed net-metering data
-- (import, export, banked credit) plus the result of the automatic bill check.

ALTER TABLE public.electricity_bills
  ALTER COLUMN fixed_charge SET DEFAULT 0,
  ALTER COLUMN energy_charge SET DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_kwh          NUMERIC CHECK (import_kwh IS NULL OR import_kwh >= 0),
  ADD COLUMN IF NOT EXISTS export_kwh          NUMERIC CHECK (export_kwh IS NULL OR export_kwh >= 0),
  ADD COLUMN IF NOT EXISTS banked_opening_kwh  NUMERIC CHECK (banked_opening_kwh IS NULL OR banked_opening_kwh >= 0),
  ADD COLUMN IF NOT EXISTS banked_closing_kwh  NUMERIC CHECK (banked_closing_kwh IS NULL OR banked_closing_kwh >= 0),
  ADD COLUMN IF NOT EXISTS billed_units        NUMERIC CHECK (billed_units IS NULL OR billed_units >= 0),
  ADD COLUMN IF NOT EXISTS electricity_duty    NUMERIC CHECK (electricity_duty IS NULL OR electricity_duty >= 0),
  ADD COLUMN IF NOT EXISTS fuel_surcharge      NUMERIC,
  ADD COLUMN IF NOT EXISTS source              TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'upload')),
  ADD COLUMN IF NOT EXISTS checks              JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.electricity_bills
  DROP CONSTRAINT IF EXISTS chk_bill_period,
  ADD CONSTRAINT chk_bill_period CHECK (billing_period_end > billing_period_start AND billing_period_end - billing_period_start <= 62);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bill_user_period_end ON public.electricity_bills (user_id, billing_period_end);
