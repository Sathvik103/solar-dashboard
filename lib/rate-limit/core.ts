/**
 * Rate-limiting algorithms and stores.
 *
 * Two algorithms are implemented so the trade-offs are easy to compare:
 *
 *  - Sliding-window log (in memory): stores each request timestamp for the key and counts those inside
 *    the window. Exact, but memory grows with traffic and it only works per process.
 *  - Fixed-window counter (Redis): one INCR per request on a key bucketed by window. O(1) memory and
 *    shared across every server instance, at the cost of allowing up to 2x the limit across a window
 *    boundary.
 *
 * `checkRateLimit` uses Redis (Upstash REST API, no SDK) when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set and falls back to memory if Redis is unreachable (fail-open per
 * instance rather than rejecting every request).
 */

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  /** Unix seconds when the window resets. */
  resetAt: number
  retryAfterSeconds: number
  backend: 'redis' | 'memory'
}

const windows = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    windows.set(key, recent)
    const resetMs = recent[0] + windowMs
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: Math.ceil(resetMs / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((resetMs - now) / 1000)),
      backend: 'memory',
    }
  }
  recent.push(now)
  windows.set(key, recent)

  // Opportunistic cleanup keeps memory bounded under many distinct keys.
  if (windows.size > 5000) {
    for (const [k, ts] of windows) if (ts.every((t) => now - t >= windowMs)) windows.delete(k)
  }
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - recent.length),
    resetAt: Math.ceil((recent[0] + windowMs) / 1000),
    retryAfterSeconds: 0,
    backend: 'memory',
  }
}

export function resetRateLimits() {
  windows.clear()
}

type FetchLike = typeof fetch

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  opts: { url?: string; token?: string; fetchImpl?: FetchLike; now?: number } = {}
): Promise<RateLimitResult> {
  const url = opts.url ?? process.env.UPSTASH_REDIS_REST_URL
  const token = opts.token ?? process.env.UPSTASH_REDIS_REST_TOKEN
  const now = opts.now ?? Date.now()
  if (!url || !token) return rateLimit(key, limit, windowMs, now)

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const bucket = Math.floor(now / 1000 / windowSec)
  const redisKey = `rl:${key}:${bucket}`
  const resetAt = (bucket + 1) * windowSec
  try {
    const res = await (opts.fetchImpl ?? fetch)(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, String(windowSec + 1)],
      ]),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`)
    const [incr] = (await res.json()) as { result?: number; error?: string }[]
    if (typeof incr?.result !== 'number') throw new Error(incr?.error ?? 'Bad Upstash response')
    const count = incr.result
    const retryAfter = Math.max(1, resetAt - Math.floor(now / 1000))
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfterSeconds: count > limit ? retryAfter : 0,
      backend: 'redis',
    }
  } catch (err) {
    console.warn('[rate-limit] Redis unavailable, using in-memory limiter:', (err as Error).message)
    return rateLimit(key, limit, windowMs, now)
  }
}
