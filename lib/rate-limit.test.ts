import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, rateLimit, resetRateLimits } from './rate-limit'

describe('rateLimit (in-memory)', () => {
  beforeEach(resetRateLimits)

  it('blocks after the limit and recovers after the window', () => {
    expect(rateLimit('u', 2, 1000, 0).allowed).toBe(true)
    expect(rateLimit('u', 2, 1000, 10).allowed).toBe(true)
    const blocked = rateLimit('u', 2, 1000, 20)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(1)
    expect(rateLimit('u', 2, 1000, 1500).allowed).toBe(true)
  })

  it('tracks keys independently', () => {
    rateLimit('a', 1, 1000, 0)
    expect(rateLimit('b', 1, 1000, 0).allowed).toBe(true)
  })
})

describe('checkRateLimit (Upstash)', () => {
  beforeEach(resetRateLimits)

  const upstash = (count: number) =>
    vi.fn(async () => new Response(JSON.stringify([{ result: count }, { result: 1 }]), { status: 200 }))

  it('uses Redis counts when configured', async () => {
    const opts = { url: 'https://example.upstash.io', token: 't', now: 60_000 }
    expect((await checkRateLimit('k', 5, 60_000, { ...opts, fetchImpl: upstash(5) })).allowed).toBe(true)
    const blocked = await checkRateLimit('k', 5, 60_000, { ...opts, fetchImpl: upstash(6) })
    expect(blocked).toMatchObject({ allowed: false, backend: 'redis' })
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('falls back to memory when Redis fails', async () => {
    const failing = vi.fn(async () => new Response('down', { status: 500 }))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = await checkRateLimit('k', 5, 60_000, { url: 'https://x', token: 't', fetchImpl: failing })
    expect(r).toMatchObject({ allowed: true, backend: 'memory' })
  })

  it('uses memory when not configured', async () => {
    const r = await checkRateLimit('k', 5, 60_000, { url: '', token: '' })
    expect(r.backend).toBe('memory')
  })
})
