import type { Sample } from './types.js'

export type UploadOutcome =
  | { kind: 'ok'; accepted: number; duplicates: number; rejected: number }
  | { kind: 'retry'; delayMs: number; reason: string }
  | { kind: 'fatal'; reason: string }

const BASE_DELAY_MS = 5_000
const MAX_DELAY_MS = 10 * 60_000

/** Exponential backoff with full jitter: 5 s, 10 s, 20 s ... capped at 10 min. */
export function backoffMs(attempt: number, random = Math.random): number {
  const cap = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt)
  return Math.round(cap / 2 + random() * (cap / 2))
}

/** Posts one batch. Classifies failures so the agent knows whether to retry, wait, or stop. */
export async function uploadBatch(
  url: string,
  token: string,
  samples: Sample[],
  attempt: number,
  fetchImpl: typeof fetch = fetch
): Promise<UploadOutcome> {
  let res: Response
  try {
    res = await fetchImpl(`${url.replace(/\/$/, '')}/api/v1/telemetry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'solarintel-edge/1.0' },
      body: JSON.stringify({ samples }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    return { kind: 'retry', delayMs: backoffMs(attempt), reason: `network: ${(err as Error).message}` }
  }

  if (res.status === 202 || res.status === 200) {
    const body = (await res.json().catch(() => ({}))) as { accepted?: number; duplicates?: number; rejected?: number }
    return { kind: 'ok', accepted: body.accepted ?? 0, duplicates: body.duplicates ?? 0, rejected: body.rejected ?? 0 }
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'))
    return { kind: 'retry', delayMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : backoffMs(attempt), reason: 'rate limited' }
  }
  if (res.status === 401) return { kind: 'fatal', reason: 'token rejected (revoked, rotated or device removed)' }
  if (res.status === 413 || res.status === 422) {
    const body = await res.text().catch(() => '')
    return { kind: 'fatal', reason: `server rejected the batch (${res.status}): ${body.slice(0, 300)}` }
  }
  return { kind: 'retry', delayMs: backoffMs(attempt), reason: `HTTP ${res.status}` }
}
