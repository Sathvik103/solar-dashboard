-- Migration: 012_drop_unused_tables.sql
-- Description: removes empty planning tables that the application never reads or writes.
-- NOT YET APPLIED: dropping tables needs explicit approval.

DROP TABLE IF EXISTS public.recommendation_history;
DROP TABLE IF EXISTS public.saved_scenarios;
DROP TABLE IF EXISTS public.dashboard_preferences;
DROP TABLE IF EXISTS public.tariff_history;
