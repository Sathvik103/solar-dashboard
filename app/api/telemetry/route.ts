import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  hashDeviceToken,
  parseBearerToken,
  TelemetryPayloadSchema,
  toRpcReadings,
} from '@/lib/telemetry'

const MAX_BODY_BYTES = 64 * 1024

/**
 * Device ingestion endpoint. Authenticated by a per-device bearer token (created on the
 * Profile page); writes daily generation totals tagged `inverter_telemetry`.
 */
export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Missing or malformed bearer token' }, { status: 401 })

  const tokenHash = hashDeviceToken(token)
  const limit = await checkRateLimit(`telemetry:${tokenHash}`, 60, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = TelemetryPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join('.'), message: i.message })) },
      { status: 422 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('ingest_device_readings', {
    p_token_hash: tokenHash,
    p_readings: toRpcReadings(parsed.data.readings),
  })

  if (error) {
    if (error.code === '28000') return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 })
    console.error('[api/telemetry] ingest failed', error.code, error.message)
    return NextResponse.json({ error: 'Failed to store readings' }, { status: 500 })
  }

  return NextResponse.json({ accepted: data ?? 0 }, { status: 202 })
}
