-- Migration: 007_security_and_performance_hardening.sql
-- Description: Resolves Supabase advisor findings.
--   * RLS policies evaluate auth.uid() once per statement ((select auth.uid())) and apply only to
--     the authenticated role.
--   * SECURITY DEFINER functions are no longer callable by anon; the signup trigger function is not
--     callable via the REST API at all.
--   * set_updated_at gets a fixed search_path.
--   * Covering indexes for user_id / system_id foreign keys.

ALTER FUNCTION public.set_updated_at() SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(extensions.vector, integer, double precision, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(extensions.vector, integer, double precision, text, text, text) TO authenticated;

ALTER POLICY "agent_runs_insert_own" ON public.agent_runs TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "agent_runs_select_own" ON public.agent_runs TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "consumption_history_own" ON public.consumption_history TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "conversations_delete_own" ON public.conversations TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "conversations_insert_own" ON public.conversations TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "conversations_select_own" ON public.conversations TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "conversations_update_own" ON public.conversations TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "dashboard_preferences_own" ON public.dashboard_preferences TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "electricity_bills_own" ON public.electricity_bills TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "messages_delete_own" ON public.messages TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "messages_insert_own" ON public.messages TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "messages_select_own" ON public.messages TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "ml_predictions_own" ON public.ml_predictions TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "profiles_own" ON public.profiles TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
ALTER POLICY "recommendation_history_own" ON public.recommendation_history TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "saved_scenarios_own" ON public.saved_scenarios TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "solar_generation_history_own" ON public.solar_generation_history TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "solar_profiles_delete_own" ON public.solar_profiles TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "solar_profiles_insert_own" ON public.solar_profiles TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "solar_profiles_select_own" ON public.solar_profiles TO authenticated
  USING ((select auth.uid()) = user_id);
ALTER POLICY "solar_profiles_update_own" ON public.solar_profiles TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "solar_systems_own" ON public.solar_systems TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "users_select_own" ON public.users TO authenticated
  USING ((select auth.uid()) = id);
ALTER POLICY "users_update_own" ON public.users TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE INDEX IF NOT EXISTS idx_electricity_bills_user_id ON public.electricity_bills (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages (user_id);
CREATE INDEX IF NOT EXISTS idx_ml_datasets_user_id ON public.ml_datasets (user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_user_id ON public.recommendation_history (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_scenarios_user_id ON public.saved_scenarios (user_id);
CREATE INDEX IF NOT EXISTS idx_generation_system_id ON public.solar_generation_history (system_id);
CREATE INDEX IF NOT EXISTS idx_solar_systems_user_id ON public.solar_systems (user_id);
