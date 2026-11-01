import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/client'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'
import { readJson } from '@/lib/http'
import { hashDeviceToken, parseBearerToken } from '@/lib/telemetry'
import { TelemetryBatchSchema, type IngestResult } from '@/lib/iot/samples'

// 1,000 samples with every field is about 250 KB of JSON.
const MAX_BODY_BYTES = 512 * 1024

/**
 * Device ingestion, v1.
 *
 *   POST /api/v1/telemetry
 *   Authorization: Bearer sdt_...
 *   { "samples": [{ "ts": "2026-11-01T12:05:00+05:30", "power_w": 3120, "energy_wh_total": 1834520 }] }
 *
 * Idempotent: a sample is identified by (device, ts), so a device can resend a buffered batch after a
 * network failure without double counting. Responds 202 with accepted/duplicate/rejected counts.
 */
export async function POST(request: Request) {
  const token = parseBearerToken(request.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'Missing or malformed bearer token' }, { status: 401 })

  const tokenHash = hashDeviceToken(token)
  const limit = await enforce('telemetry', tokenHash)
  if (!limit.allowed) return tooManyRequests(limit, 'Too many requests. Batch samples and send less often.')
  const headers = rateLimitHeaders(limit)

  const body = await readJson(request, TelemetryBatchSchema, MAX_BODY_BYTES, headers)
  if (!body.ok) return body.response

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('ingest_telemetry', {
    p_token_hash: tokenHash,
    p_samples: body.data.samples,
  })

  if (error) {
    if (error.code === '28000') return NextResponse.json({ error: 'Invalid, revoked or archived device token' }, { status: 401, headers })
    if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 422, headers })
    console.error('[api/v1/telemetry] ingest failed', error.code, error.message)
    return NextResponse.json({ error: 'Failed to store samples' }, { status: 500, headers })
  }

  return NextResponse.json(data as IngestResult, { status: 202, headers })
}
