import { NextResponse } from 'next/server'
import { checkRateLimit, type RateLimitResult } from './core'

export { checkRateLimit, rateLimit, resetRateLimits, type RateLimitResult } from './core'

/**
 * Every rate-limited surface in one place. Keys are namespaced by policy, so a user who exhausts the
 * chat budget can still search the regulations. Tune limits here, not in route handlers.
 */
export const POLICIES = {
  /** Assistant messages per signed-in user. LLM spend is separately capped per day (lib/agent/budget). */
  chat: { limit: 20, windowMs: 60_000 },
  /** Interval telemetry per device token (a 10 s device sends 6/min; batching keeps this far below). */
  telemetry: { limit: 120, windowMs: 60_000 },
  /** Legacy daily-total endpoint per token. */
  telemetryDaily: { limit: 60, windowMs: 60_000 },
  /** Live device polling per user (the UI polls every 15 s). */
  deviceLive: { limit: 60, windowMs: 60_000 },
  /** Knowledge search per user; each search costs one embedding call. */
  knowledgeSearch: { limit: 30, windowMs: 60_000 },
  /** Retrieval benchmark per user; runs 30 embedding calls. */
  evaluation: { limit: 3, windowMs: 10 * 60_000 },
  /** Sign-in and sign-up attempts per client IP. */
  auth: { limit: 10, windowMs: 15 * 60_000 },
} as const satisfies Record<string, { limit: number; windowMs: number }>

export type PolicyName = keyof typeof POLICIES

export function enforce(policy: PolicyName, subject: string): Promise<RateLimitResult> {
  const { limit, windowMs } = POLICIES[policy]
  return checkRateLimit(`${policy}:${subject}`, limit, windowMs)
}

/** IETF draft RateLimit headers plus Retry-After when blocked. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(r.limit),
    'RateLimit-Remaining': String(r.remaining),
    'RateLimit-Reset': String(Math.max(0, r.resetAt - Math.floor(Date.now() / 1000))),
  }
  if (!r.allowed) headers['Retry-After'] = String(r.retryAfterSeconds)
  return headers
}

export function tooManyRequests(r: RateLimitResult, message = 'Too many requests. Please slow down.') {
  return NextResponse.json({ error: message, retryAfterSeconds: r.retryAfterSeconds }, { status: 429, headers: rateLimitHeaders(r) })
}

/** Best-effort client IP behind a proxy/CDN. Only trust these headers when the host sets them. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
