import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, resetRateLimits } from './rate-limit'

describe('rateLimit', () => {
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
