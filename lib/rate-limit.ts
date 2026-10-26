/**
 * Best-effort sliding-window rate limiter held in process memory.
 * On serverless platforms each instance keeps its own window, so this bounds
 * abuse per instance; swap the store for Redis/Upstash for a global limit.
 */
const windows = new Map<string, number[]>()

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    windows.set(key, recent)
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
  }
  recent.push(now)
  windows.set(key, recent)

  if (windows.size > 5000) {
    for (const [k, ts] of windows) if (ts.every((t) => now - t >= windowMs)) windows.delete(k)
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

export function resetRateLimits() {
  windows.clear()
}
