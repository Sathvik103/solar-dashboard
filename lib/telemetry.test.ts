import { describe, it, expect } from 'vitest'
import {
  generateDeviceToken,
  hashDeviceToken,
  parseBearerToken,
  TelemetryPayloadSchema,
  toRpcReadings,
} from './telemetry'

describe('device tokens', () => {
  it('generates unique 256-bit tokens whose hash is stable', () => {
    const a = generateDeviceToken()
    const b = generateDeviceToken()
    expect(a.token).not.toBe(b.token)
    expect(a.token).toMatch(/^sdt_[A-Za-z0-9_-]{43}$/)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashDeviceToken(a.token)).toBe(a.hash)
    expect(a.token.startsWith(a.prefix)).toBe(true)
  })

  it('parses only well-formed bearer headers', () => {
    const { token } = generateDeviceToken()
    expect(parseBearerToken(`Bearer ${token}`)).toBe(token)
    expect(parseBearerToken(token)).toBeNull()
    expect(parseBearerToken('Bearer sdt_short')).toBeNull()
    expect(parseBearerToken(null)).toBeNull()
  })
})

describe('telemetry payload', () => {
  it('rejects exports above generation and empty batches', () => {
    expect(TelemetryPayloadSchema.safeParse({ readings: [] }).success).toBe(false)
    expect(
      TelemetryPayloadSchema.safeParse({ readings: [{ date: '2026-10-01', generation_kwh: 5, exported_kwh: 6 }] }).success
    ).toBe(false)
  })

  it('keeps the last reading per day and fills defaults', () => {
    const rows = toRpcReadings([
      { date: '2026-10-01', generation_kwh: 3 },
      { date: '2026-10-01', generation_kwh: 12.5, exported_kwh: 4 },
      { date: '2026-10-02', generation_kwh: 10 },
    ])
    expect(rows).toEqual([
      { record_date: '2026-10-01', generation_kwh: 12.5, exported_kwh: 4, grid_import_kwh: 0, peak_kw: null },
      { record_date: '2026-10-02', generation_kwh: 10, exported_kwh: 0, grid_import_kwh: 0, peak_kw: null },
    ])
  })
})
