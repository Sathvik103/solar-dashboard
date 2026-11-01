import { describe, it, expect } from 'vitest'
import { completeness, deviceStatus, energyFromSamples, TelemetryBatchSchema } from './samples'

describe('telemetry batch schema', () => {
  it('requires timezone-qualified timestamps and caps batch size', () => {
    expect(TelemetryBatchSchema.safeParse({ samples: [{ ts: '2026-11-01T12:00:00', power_w: 1 }] }).success).toBe(false)
    expect(TelemetryBatchSchema.safeParse({ samples: [{ ts: '2026-11-01T12:00:00+05:30', power_w: 1 }] }).success).toBe(true)
    const big = Array.from({ length: 1001 }, () => ({ ts: '2026-11-01T12:00:00Z' }))
    expect(TelemetryBatchSchema.safeParse({ samples: big }).success).toBe(false)
  })
})

describe('deviceStatus', () => {
  const now = Date.parse('2026-11-01T12:00:00Z')
  it('classifies by multiples of the reporting interval', () => {
    expect(deviceStatus(null, 300, now)).toBe('never')
    expect(deviceStatus('2026-11-01T11:55:00Z', 300, now)).toBe('online')
    expect(deviceStatus('2026-11-01T11:40:00Z', 300, now)).toBe('delayed')
    expect(deviceStatus('2026-11-01T10:00:00Z', 300, now)).toBe('offline')
  })
})

describe('energyFromSamples', () => {
  it('prefers lifetime counters, using the previous-day baseline when given', () => {
    const s = [
      { ts: '2026-11-01T06:00:00Z', power_w: 100, energy_wh_total: 1000 },
      { ts: '2026-11-01T12:00:00Z', power_w: 3000, energy_wh_total: 9000 },
    ]
    expect(energyFromSamples(s)).toBe(8000)
    expect(energyFromSamples(s, 900)).toBe(8100)
  })

  it('integrates power when there are no counters and skips long gaps', () => {
    const s = [
      { ts: '2026-11-01T10:00:00Z', power_w: 1000, energy_wh_total: null },
      { ts: '2026-11-01T10:30:00Z', power_w: 1000, energy_wh_total: null },
      { ts: '2026-11-01T13:00:00Z', power_w: 1000, energy_wh_total: null },
    ]
    expect(energyFromSamples(s)).toBeCloseTo(500, 6)
  })

  it('computes completeness', () => {
    expect(completeness(144, 86400, 300)).toBe(0.5)
    expect(completeness(500, 86400, 300)).toBe(1)
  })
})
