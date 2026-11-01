import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/client'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'
import { readJson } from '@/lib/http'
import { hashDeviceToken, parseBearerToken, TelemetryPayloadSchema, toRpcReadings } from '@/lib/telemetry'

const MAX_BODY_BYTES = 64 * 1024

/**
 * Legacy daily-total endpoint. Devices registered on the Devices page should use
 * POST /api/v1/telemetry with interval samples instead; this route stays for existing integrations.
 */
export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Missing or malformed bearer token' }, { status: 401 })

  const tokenHash = hashDeviceToken(token)
  const limit = await enforce('telemetryDaily', tokenHash)
  if (!limit.allowed) return tooManyRequests(limit)
  const headers = rateLimitHeaders(limit)

  const body = await readJson(request, TelemetryPayloadSchema, MAX_BODY_BYTES, headers)
  if (!body.ok) return body.response

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('ingest_device_readings', {
    p_token_hash: tokenHash,
    p_readings: toRpcReadings(body.data.readings),
  })

  if (error) {
    if (error.code === '28000') return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401, headers })
    console.error('[api/telemetry] ingest failed', error.code, error.message)
    return NextResponse.json({ error: 'Failed to store readings' }, { status: 500, headers })
  }

  return NextResponse.json(
    { accepted: data ?? 0, deprecated: 'Use POST /api/v1/telemetry with interval samples.' },
    { status: 202, headers }
  )
}
