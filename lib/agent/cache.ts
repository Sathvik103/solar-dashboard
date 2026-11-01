import 'server-only'

import { createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/db/client'
import type { Json } from '@/lib/types/supabase'

/**
 * Answer cache. The key covers the normalised question AND everything the answer depends on
 * (profile, tool outputs, retrieved passage ids, recent conversation), so a cached answer is only
 * reused when it would be identical. Entries live for 12 hours and are per user (RLS).
 */
const TTL_MS = 12 * 3600 * 1000

export function normaliseQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cacheKey(question: string, context: unknown): string {
  return createHash('sha256')
    .update(normaliseQuestion(question))
    .update('\u0000')
    .update(JSON.stringify(context))
    .digest('hex')
}

export async function getCachedAnswer(userId: string, key: string): Promise<{ answer: string; payload: Json } | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('assistant_cache')
    .select('answer, payload, hits')
    .eq('user_id', userId)
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (!data) return null
  void supabase
    .from('assistant_cache')
    .update({ hits: data.hits + 1 })
    .eq('user_id', userId)
    .eq('cache_key', key)
    .then(() => undefined)
  return { answer: data.answer, payload: data.payload }
}

export async function putCachedAnswer(userId: string, key: string, answer: string, payload: Json): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('assistant_cache').upsert(
    {
      user_id: userId,
      cache_key: key,
      answer,
      payload,
      hits: 0,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    },
    { onConflict: 'user_id,cache_key' }
  )
  if (error) console.warn('[assistant-cache] write failed', error.message)
}
