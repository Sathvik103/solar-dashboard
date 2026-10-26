-- Migration: 005_create_analytics_and_ml_pipeline.sql
-- Description: Creates modular analytics, historical data, regional intelligence, and ML pipeline tables with RLS policies.

-- 1. Extended Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  city        TEXT NOT NULL DEFAULT 'Hyderabad',
  district    TEXT DEFAULT 'Hyderabad',
  state       TEXT NOT NULL DEFAULT 'Telangana',
  pincode     TEXT DEFAULT '500001',
  latitude    NUMERIC,
  longitude   NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Consumption History Table
CREATE TABLE IF NOT EXISTS public.consumption_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  record_date     DATE NOT NULL,
  month           TEXT NOT NULL,
  year            INT NOT NULL,
  consumption_kwh NUMERIC NOT NULL,
  peak_demand_kw  NUMERIC,
  bill_amount     NUMERIC NOT NULL,
  units_imported  NUMERIC,
  units_exported  NUMERIC DEFAULT 0,
  tariff_rate     NUMERIC DEFAULT 8.0,
  source          TEXT NOT NULL CHECK (source IN ('user_entered', 'bill_import', 'demo_seed', 'estimated')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_month_year UNIQUE (user_id, month, year)
);

-- 3. Electricity Bills Table
CREATE TABLE IF NOT EXISTS public.electricity_bills (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end   DATE NOT NULL,
  units_consumed       NUMERIC NOT NULL,
  fixed_charge         NUMERIC NOT NULL DEFAULT 80,
  energy_charge        NUMERIC NOT NULL,
  taxes                NUMERIC NOT NULL DEFAULT 0,
  other_charges        NUMERIC DEFAULT 0,
  total_bill           NUMERIC NOT NULL,
  tariff_category      TEXT NOT NULL DEFAULT 'LT-1 Domestic',
  tariff_rate          NUMERIC NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Solar Systems Table
CREATE TABLE IF NOT EXISTS public.solar_systems (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  capacity_kw          NUMERIC NOT NULL,
  panel_count          INT,
  panel_wattage        INT,
  inverter_capacity_kw NUMERIC,
  installation_cost    NUMERIC NOT NULL,
  subsidy_amount       NUMERIC NOT NULL DEFAULT 0,
  net_cost             NUMERIC NOT NULL,
  installation_date    DATE,
  installer            TEXT,
  system_status        TEXT NOT NULL DEFAULT 'active' CHECK (system_status IN ('proposed', 'installed', 'active', 'decommissioned')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Solar Generation History Table
CREATE TABLE IF NOT EXISTS public.solar_generation_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  system_id          UUID REFERENCES public.solar_systems(id) ON DELETE SET NULL,
  record_date        DATE NOT NULL,
  generation_kwh     NUMERIC NOT NULL,
  exported_kwh       NUMERIC NOT NULL DEFAULT 0,
  self_consumed_kwh  NUMERIC NOT NULL DEFAULT 0,
  grid_import_kwh    NUMERIC NOT NULL DEFAULT 0,
  peak_generation_kw NUMERIC,
  solar_irradiance   NUMERIC,
  weather_condition  TEXT DEFAULT 'Sunny',
  source             TEXT NOT NULL CHECK (source IN ('inverter_telemetry', 'manual_log', 'demo_seed', 'estimated')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Regional Statistics Table
CREATE TABLE IF NOT EXISTS public.regional_statistics (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state                       TEXT NOT NULL DEFAULT 'Telangana',
  district                    TEXT NOT NULL,
  city                        TEXT NOT NULL,
  pincode                     TEXT,
  record_date                 DATE NOT NULL,
  average_solar_irradiance    NUMERIC NOT NULL, -- kWh/m²/day
  average_generation_per_kw   NUMERIC NOT NULL, -- kWh/month per kW
  average_monthly_consumption NUMERIC NOT NULL, -- kWh/month
  average_electricity_tariff  NUMERIC NOT NULL, -- INR/kWh
  average_roof_area           NUMERIC NOT NULL, -- sqft
  adoption_rate               NUMERIC NOT NULL, -- % of suitable homes
  installed_capacity_mw       NUMERIC NOT NULL,
  average_system_size_kw      NUMERIC NOT NULL,
  average_payback_years       NUMERIC NOT NULL,
  average_monthly_savings     NUMERIC NOT NULL,
  co2_reduction_tonnes        NUMERIC NOT NULL,
  source                      TEXT NOT NULL DEFAULT 'TGREDCO / MNRE Statistical Bulletin',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tariff History Table
CREATE TABLE IF NOT EXISTS public.tariff_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state          TEXT NOT NULL DEFAULT 'Telangana',
  discom         TEXT NOT NULL DEFAULT 'TSSPDCL',
  category       TEXT NOT NULL DEFAULT 'LT-1 Domestic',
  slab_name      TEXT NOT NULL,
  min_units      INT NOT NULL,
  max_units      INT NOT NULL,
  rate_per_unit  NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  effective_to   DATE,
  source         TEXT NOT NULL DEFAULT 'TGERC Tariff Order',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Recommendation History Table
CREATE TABLE IF NOT EXISTS public.recommendation_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query                    TEXT NOT NULL,
  recommended_capacity_kw  NUMERIC NOT NULL,
  alternative_capacity_kw  NUMERIC,
  estimated_generation     NUMERIC NOT NULL,
  estimated_savings        NUMERIC NOT NULL,
  net_cost                 NUMERIC NOT NULL,
  payback_years            NUMERIC NOT NULL,
  confidence               NUMERIC DEFAULT 0.95,
  reasoning                TEXT NOT NULL,
  evidence                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Saved Scenarios Table
CREATE TABLE IF NOT EXISTS public.saved_scenarios (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  monthly_consumption_kwh  NUMERIC NOT NULL,
  monthly_bill_inr         NUMERIC NOT NULL,
  roof_area_sqft           NUMERIC NOT NULL,
  tariff_inr               NUMERIC NOT NULL DEFAULT 8.0,
  capacity_kw              NUMERIC NOT NULL,
  subsidy_inr              NUMERIC NOT NULL DEFAULT 78000,
  shading_level            TEXT NOT NULL DEFAULT 'none',
  calculated_savings_inr   NUMERIC NOT NULL,
  calculated_payback_years NUMERIC NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Dashboard Preferences Table
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  enabled_widgets JSONB NOT NULL DEFAULT '["current_power", "today_generation", "money_saved", "carbon_reduction", "generation_chart", "ai_recommendation", "regional_stats"]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ML Datasets Table (Metadata tracker for future Python models)
CREATE TABLE IF NOT EXISTS public.ml_datasets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dataset_type     TEXT NOT NULL CHECK (dataset_type IN ('consumption_forecast', 'solar_generation_forecast', 'energy_analysis')),
  feature_schema   JSONB NOT NULL DEFAULT '[]'::jsonb,
  record_count     INT NOT NULL DEFAULT 0,
  date_range_start DATE,
  date_range_end   DATE,
  source           TEXT NOT NULL DEFAULT 'supabase_historical_export',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ML Predictions Table (Receives external predictions from Python model)
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('consumption_forecast', 'solar_generation_forecast', 'electricity_bill_forecast')),
  prediction_date DATE NOT NULL,
  predicted_value NUMERIC NOT NULL,
  actual_value    NUMERIC,
  unit            TEXT NOT NULL DEFAULT 'kWh',
  model_version   TEXT NOT NULL DEFAULT 'python_pipeline_v1',
  confidence      NUMERIC,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

-- User Policies: Read/write own data
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "consumption_history_own" ON public.consumption_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "electricity_bills_own" ON public.electricity_bills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "solar_systems_own" ON public.solar_systems FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "solar_generation_history_own" ON public.solar_generation_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "recommendation_history_own" ON public.recommendation_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "saved_scenarios_own" ON public.saved_scenarios FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "dashboard_preferences_own" ON public.dashboard_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ml_predictions_own" ON public.ml_predictions FOR ALL USING (auth.uid() = user_id);

-- Public Read Policies for Reference Tables (Regional Stats & Tariffs)
CREATE POLICY "regional_statistics_read" ON public.regional_statistics FOR SELECT USING (true);
CREATE POLICY "tariff_history_read" ON public.tariff_history FOR SELECT USING (true);
CREATE POLICY "ml_datasets_read" ON public.ml_datasets FOR SELECT USING (true);
