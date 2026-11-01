-- Migration: 009_sanctioned_load.sql
-- Description: Stores the sanctioned (contracted) connection load from the electricity bill.
-- It drives the LT-I fixed charge (Rs 10/kW/month) and flags solar sizes that exceed it.

ALTER TABLE public.solar_profiles
  ADD COLUMN IF NOT EXISTS sanctioned_load_kw NUMERIC
  CHECK (sanctioned_load_kw IS NULL OR (sanctioned_load_kw > 0 AND sanctioned_load_kw <= 150));

COMMENT ON COLUMN public.solar_profiles.sanctioned_load_kw IS
  'Sanctioned (contracted) connection load printed on the electricity bill, kW. Drives the LT-I fixed charge.';
