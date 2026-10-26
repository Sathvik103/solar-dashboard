/**
 * Rate limiting.
 *
 * `checkRateLimit` uses a global fixed-window counter in Upstash Redis (REST API, no SDK)
 * when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, so the limit holds
 * across serverless instances. Without them, or if Redis is unreachable, it falls back to
 * the in-process sliding window below, which only bounds abuse per instance.
 */
const windows = new Map<string, number[]>()

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number; backend: 'redis' | 'memory' }

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    windows.set(key, recent)
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)),
      backend: 'memory',
    }
  }
  recent.push(now)
  windows.set(key, recent)

  if (windows.size > 5000) {
    for (const [k, ts] of windows) if (ts.every((t) => now - t >= windowMs)) windows.delete(k)
  }
  return { allowed: true, retryAfterSeconds: 0, backend: 'memory' }
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
    const retryAfter = Math.max(1, (bucket + 1) * windowSec - Math.floor(now / 1000))
    return incr.result > limit
      ? { allowed: false, retryAfterSeconds: retryAfter, backend: 'redis' }
      : { allowed: true, retryAfterSeconds: 0, backend: 'redis' }
  } catch (err) {
    console.warn('[rate-limit] Redis unavailable, using in-memory limiter:', (err as Error).message)
    return rateLimit(key, limit, windowMs, now)
  }
}
