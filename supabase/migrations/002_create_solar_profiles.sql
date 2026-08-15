-- Migration: 002_create_solar_profiles.sql
-- Description: Creates public.solar_profiles table storing user self-reported solar installation details, with RLS enabled.

CREATE TABLE IF NOT EXISTS public.solar_profiles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Location
  city                   TEXT NOT NULL DEFAULT 'Hyderabad',
  state                  TEXT NOT NULL DEFAULT 'Telangana',
  district               TEXT,
  pincode                TEXT,

  -- Consumption & billing
  monthly_bill_inr       NUMERIC(10,2),
  monthly_units_kwh      NUMERIC(8,2),
  -- User-entered convenience field for Phase 2. NOT authoritative. Will be superseded by knowledge-base tariff data in Phase 3+.
  electricity_tariff_inr NUMERIC(6,4),

  -- Roof details
  roof_area_sqft         NUMERIC(8,2),
  roof_type              TEXT,
  roof_orientation       TEXT,
  shading_level          TEXT,

  -- Desired system
  budget_inr             NUMERIC(12,2),
  preferred_capacity_kw  NUMERIC(6,2),
  battery_preference     TEXT NOT NULL DEFAULT 'no-battery',

  -- Timestamps
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation constraints
ALTER TABLE public.solar_profiles
  ADD CONSTRAINT chk_roof_type CHECK (
    roof_type IS NULL OR roof_type IN ('flat-rcc', 'flat-concrete', 'sloped-tile', 'metal-sheet', 'other')
  ),
  ADD CONSTRAINT chk_roof_orientation CHECK (
    roof_orientation IS NULL OR roof_orientation IN ('south', 'south-east', 'south-west', 'east', 'west', 'north', 'flat', 'other')
  ),
  ADD CONSTRAINT chk_shading_level CHECK (
    shading_level IS NULL OR shading_level IN ('none', 'low', 'medium', 'high', 'partial', 'heavy')
  ),
  ADD CONSTRAINT chk_battery_preference CHECK (
    battery_preference IN ('no-battery', 'add-battery-now', 'future-expansion', 'battery-backup', 'off-grid')
  ),
  ADD CONSTRAINT chk_monthly_bill_positive CHECK (monthly_bill_inr IS NULL OR monthly_bill_inr >= 0),
  ADD CONSTRAINT chk_monthly_units_positive CHECK (monthly_units_kwh IS NULL OR monthly_units_kwh >= 0),
  ADD CONSTRAINT chk_roof_area_positive CHECK (roof_area_sqft IS NULL OR (roof_area_sqft > 0 AND roof_area_sqft <= 10000)),
  ADD CONSTRAINT chk_budget_positive CHECK (budget_inr IS NULL OR budget_inr >= 0),
  ADD CONSTRAINT chk_capacity_positive CHECK (preferred_capacity_kw IS NULL OR (preferred_capacity_kw > 0 AND preferred_capacity_kw <= 500));

DROP TRIGGER IF EXISTS set_solar_profiles_updated_at ON public.solar_profiles;
CREATE TRIGGER set_solar_profiles_updated_at
  BEFORE UPDATE ON public.solar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.solar_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solar_profiles_select_own" ON public.solar_profiles;
CREATE POLICY "solar_profiles_select_own"
  ON public.solar_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "solar_profiles_insert_own" ON public.solar_profiles;
CREATE POLICY "solar_profiles_insert_own"
  ON public.solar_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solar_profiles_update_own" ON public.solar_profiles;
CREATE POLICY "solar_profiles_update_own"
  ON public.solar_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "solar_profiles_delete_own" ON public.solar_profiles;
CREATE POLICY "solar_profiles_delete_own"
  ON public.solar_profiles FOR DELETE
  USING (auth.uid() = user_id);
