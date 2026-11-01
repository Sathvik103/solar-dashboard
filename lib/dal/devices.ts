import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'
import { generateDeviceToken } from '@/lib/telemetry'
import type { Database } from '@/lib/types/supabase'
import { deviceStatus, type DeviceStatus } from '@/lib/iot/samples'

type DeviceRow = Database['public']['Tables']['devices']['Row']
export type DeviceKind = DeviceRow['kind']
export type DeviceProtocol = DeviceRow['protocol']

export type DeviceRecord = {
  id: string
  name: string
  kind: DeviceKind
  protocol: DeviceProtocol
  vendor: string | null
  model: string | null
  serialNumber: string | null
  capacityKw: number | null
  reportingIntervalS: number
  lastSeenAt: string | null
  lastPowerW: number | null
  status: DeviceStatus
  createdAt: string
  token: { prefix: string; lastUsedAt: string | null } | null
}

export type DeviceTokenRecord = {
  id: string
  name: string
  tokenPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type SampleRecord = {
  ts: string
  powerW: number | null
  energyWhTotal: number | null
  importWhTotal: number | null
  exportWhTotal: number | null
  voltageV: number | null
  frequencyHz: number | null
  temperatureC: number | null
}

const MAX_DEVICES = 20

function mapDevice(d: DeviceRow, token?: { token_prefix: string; last_used_at: string | null } | null): DeviceRecord {
  return {
    id: d.id,
    name: d.name,
    kind: d.kind,
    protocol: d.protocol,
    vendor: d.vendor,
    model: d.model,
    serialNumber: d.serial_number,
    capacityKw: d.capacity_kw != null ? Number(d.capacity_kw) : null,
    reportingIntervalS: d.reporting_interval_s,
    lastSeenAt: d.last_seen_at,
    lastPowerW: d.last_power_w != null ? Number(d.last_power_w) : null,
    status: deviceStatus(d.last_seen_at, d.reporting_interval_s),
    createdAt: d.created_at,
    token: token ? { prefix: token.token_prefix, lastUsedAt: token.last_used_at } : null,
  }
}

export async function listDevices(userId?: string): Promise<DeviceRecord[]> {
  const supabase = await createSupabaseServerClient()
  const uid = userId ?? (await requireUser()).id
  const [{ data: devices, error }, { data: tokens, error: tokenError }] = await Promise.all([
    supabase.from('devices').select('*').eq('user_id', uid).is('archived_at', null).order('created_at'),
    supabase
      .from('device_tokens')
      .select('device_id, token_prefix, last_used_at')
      .eq('user_id', uid)
      .is('revoked_at', null)
      .not('device_id', 'is', null),
  ])
  if (error || tokenError) throw new Error(`Failed to load devices: ${(error ?? tokenError)?.message}`)
  const byDevice = new Map((tokens ?? []).map((t) => [t.device_id!, t]))
  return (devices ?? []).map((d) => mapDevice(d, byDevice.get(d.id)))
}

export async function getDevice(id: string): Promise<DeviceRecord | null> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(`Failed to load device: ${error.message}`)
  if (!data) return null
  const { data: token } = await supabase
    .from('device_tokens')
    .select('token_prefix, last_used_at')
    .eq('device_id', id)
    .is('revoked_at', null)
    .maybeSingle()
  return mapDevice(data, token)
}

export type CreateDeviceInput = {
  name: string
  kind: DeviceKind
  protocol: DeviceProtocol
  vendor?: string | null
  model?: string | null
  serialNumber?: string | null
  capacityKw?: number | null
  reportingIntervalS: number
}

/** Registers a device and issues its first token. The plaintext token is returned once. */
export async function createDevice(input: CreateDeviceInput): Promise<{ device: DeviceRecord; token: string }> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  const { count } = await supabase
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('archived_at', null)
  if ((count ?? 0) >= MAX_DEVICES) throw new Error(`You can register at most ${MAX_DEVICES} devices.`)

  const { data: device, error } = await supabase
    .from('devices')
    .insert({
      user_id: user.id,
      name: input.name,
      kind: input.kind,
      protocol: input.protocol,
      vendor: input.vendor || null,
      model: input.model || null,
      serial_number: input.serialNumber || null,
      capacity_kw: input.capacityKw ?? null,
      reporting_interval_s: input.reportingIntervalS,
    })
    .select('*')
    .single()
  if (error || !device) throw new Error(`Failed to register device: ${error?.message}`)

  const { token, hash, prefix } = generateDeviceToken()
  const { error: tokenError } = await supabase.from('device_tokens').insert({
    user_id: user.id,
    device_id: device.id,
    name: input.name,
    token_hash: hash,
    token_prefix: prefix,
  })
  if (tokenError) {
    await supabase.from('devices').delete().eq('id', device.id)
    throw new Error(`Failed to issue device token: ${tokenError.message}`)
  }
  return { device: mapDevice(device, { token_prefix: prefix, last_used_at: null }), token }
}

/** Revokes the device's current token and issues a new one. */
export async function rotateDeviceToken(deviceId: string): Promise<string> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const device = await getDevice(deviceId)
  if (!device) throw new Error('Device not found')

  const { error: revokeError } = await supabase
    .from('device_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('device_id', deviceId)
    .eq('user_id', user.id)
    .is('revoked_at', null)
  if (revokeError) throw new Error(`Failed to rotate token: ${revokeError.message}`)

  const { token, hash, prefix } = generateDeviceToken()
  const { error } = await supabase
    .from('device_tokens')
    .insert({ user_id: user.id, device_id: deviceId, name: device.name, token_hash: hash, token_prefix: prefix })
  if (error) throw new Error(`Failed to rotate token: ${error.message}`)
  return token
}

/** Archives a device and revokes its tokens; historical daily rollups are kept. */
export async function archiveDevice(deviceId: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()
  const [a, b] = await Promise.all([
    supabase.from('devices').update({ archived_at: now, updated_at: now }).eq('id', deviceId).eq('user_id', user.id),
    supabase.from('device_tokens').update({ revoked_at: now }).eq('device_id', deviceId).eq('user_id', user.id).is('revoked_at', null),
  ])
  if (a.error || b.error) throw new Error(`Failed to remove device: ${(a.error ?? b.error)?.message}`)
}

/** Raw samples for a device since `sinceIso` (ascending), capped at `limit`. */
export async function getDeviceSamples(deviceId: string, sinceIso: string, limit = 2000): Promise<SampleRecord[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('telemetry_samples')
    .select('ts, power_w, energy_wh_total, import_wh_total, export_wh_total, voltage_v, frequency_hz, temperature_c')
    .eq('device_id', deviceId)
    .eq('user_id', user.id)
    .gt('ts', sinceIso)
    .order('ts', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`Failed to load samples: ${error.message}`)
  const n = (v: number | null) => (v == null ? null : Number(v))
  return (data ?? []).map((s) => ({
    ts: s.ts,
    powerW: n(s.power_w),
    energyWhTotal: n(s.energy_wh_total),
    importWhTotal: n(s.import_wh_total),
    exportWhTotal: n(s.export_wh_total),
    voltageV: n(s.voltage_v),
    frequencyHz: n(s.frequency_hz),
    temperatureC: n(s.temperature_c),
  }))
}

/** Samples since `sinceIso` for every device of the user, grouped by device (for list sparklines). */
export async function getSamplesByDevice(
  sinceIso: string,
  userId?: string
): Promise<Map<string, { ts: string; power_w: number | null; energy_wh_total: number | null }[]>> {
  const supabase = await createSupabaseServerClient()
  const uid = userId ?? (await requireUser()).id
  const { data, error } = await supabase
    .from('telemetry_samples')
    .select('device_id, ts, power_w, energy_wh_total')
    .eq('user_id', uid)
    .gt('ts', sinceIso)
    .order('ts', { ascending: true })
    .limit(10000)
  if (error) throw new Error(`Failed to load samples: ${error.message}`)
  const out = new Map<string, { ts: string; power_w: number | null; energy_wh_total: number | null }[]>()
  for (const s of data ?? []) {
    const list = out.get(s.device_id) ?? []
    list.push({
      ts: s.ts,
      power_w: s.power_w == null ? null : Number(s.power_w),
      energy_wh_total: s.energy_wh_total == null ? null : Number(s.energy_wh_total),
    })
    out.set(s.device_id, list)
  }
  return out
}

// --- Legacy daily-total tokens (created before devices existed) ---------------------------------------

export async function listLegacyTokens(): Promise<DeviceTokenRecord[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('device_tokens')
    .select('id, name, token_prefix, last_used_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .is('device_id', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to load tokens: ${error.message}`)
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    tokenPrefix: d.token_prefix,
    lastUsedAt: d.last_used_at,
    revokedAt: d.revoked_at,
    createdAt: d.created_at,
  }))
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
  if (error) throw new Error(`Failed to revoke token: ${error.message}`)
}
