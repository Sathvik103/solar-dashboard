import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'
import { generateDeviceToken } from '@/lib/telemetry'

export type DeviceTokenRecord = {
  id: string
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

const MAX_ACTIVE_TOKENS = 10

export async function listDeviceTokens(): Promise<DeviceTokenRecord[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('device_tokens')
    .select('id, name, token_prefix, last_used_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load device tokens: ${error.message}`)
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    tokenPrefix: d.token_prefix,
    lastUsedAt: d.last_used_at,
    revokedAt: d.revoked_at,
    createdAt: d.created_at,
  }))
}

/** Creates a token and returns the plaintext exactly once; only its hash is stored. */
export async function createDeviceToken(name: string): Promise<{ token: string; record: DeviceTokenRecord }> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  const { count, error: countError } = await supabase
    .from('device_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (countError) throw new Error(`Failed to create device token: ${countError.message}`)
  if ((count ?? 0) >= MAX_ACTIVE_TOKENS) throw new Error(`You can have at most ${MAX_ACTIVE_TOKENS} active tokens.`)

  const { token, hash, prefix } = generateDeviceToken()
  const { data, error } = await supabase
    .from('device_tokens')
    .insert({ user_id: user.id, name, token_hash: hash, token_prefix: prefix })
    .select('id, name, token_prefix, last_used_at, revoked_at, created_at')
    .single()
  if (error || !data) throw new Error(`Failed to create device token: ${error?.message}`)
  return {
    token,
    record: {
      id: data.id,
      name: data.name,
      tokenPrefix: data.token_prefix,
      lastUsedAt: data.last_used_at,
      revokedAt: data.revoked_at,
      createdAt: data.created_at,
    },
  }
}

export async function revokeDeviceToken(id: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('device_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (error) throw new Error(`Failed to revoke device token: ${error.message}`)
}
