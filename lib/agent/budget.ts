import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'

/**
 * Per-user language-model budget. Every model call is recorded in public.llm_usage; once a user
 * reaches the daily limit the assistant answers from the calculators and documents only.
 *
 * This complements the request rate limit (lib/rate-limit): the rate limit stops bursts, the budget
 * caps total spend per user per day.
 */
export const LLM_DAILY_LIMIT = Number(process.env.LLM_DAILY_LIMIT ?? 40)

export type BudgetState = { used: number; limit: number; remaining: number }

function istMidnightIso(): string {
  const ist = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10)
  return new Date(`${ist}T00:00:00+05:30`).toISOString()
}

export async function getBudget(userId: string): Promise<BudgetState> {
  const supabase = await createSupabaseServerClient()
  const { count, error } = await supabase
    .from('llm_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', istMidnightIso())
  // If the count cannot be read, fail closed on spend but keep the assistant usable.
  const used = error ? LLM_DAILY_LIMIT : (count ?? 0)
  return { used, limit: LLM_DAILY_LIMIT, remaining: Math.max(0, LLM_DAILY_LIMIT - used) }
}

export async function recordUsage(entry: {
  userId: string
  model: string
  purpose?: string
  inputTokens?: number | null
  outputTokens?: number | null
  latencyMs: number
  outcome: 'ok' | 'error' | 'timeout'
}): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('llm_usage').insert({
    user_id: entry.userId,
    model: entry.model,
    purpose: entry.purpose ?? 'answer',
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
    latency_ms: entry.latencyMs,
    outcome: entry.outcome,
  })
  if (error) console.warn('[budget] could not record usage', error.message)
}
