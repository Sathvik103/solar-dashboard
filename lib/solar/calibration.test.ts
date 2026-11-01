import { describe, it, expect } from 'vitest'
import { fitCalibration, MIN_CALIBRATION_DAYS } from './calibration'

const days = (n: number, ratio: number, base = 15) =>
  Array.from({ length: n }, (_, i) => {
    const modelled = base + (i % 5)
    return { modelledKwh: modelled, loggedKwh: modelled * ratio }
  })

describe('fitCalibration', () => {
  it('needs a minimum number of days', () => {
    expect(fitCalibration(days(MIN_CALIBRATION_DAYS - 1, 0.9))).toBeNull()
  })

  it('recovers a constant performance ratio and removes the error', () => {
    const c = fitCalibration(days(30, 0.88))!
    expect(c.factor).toBeCloseTo(0.88, 3)
    expect(c.days).toBe(30)
    expect(c.mapeBeforePercent).toBeGreaterThan(10)
    expect(c.mapeAfterPercent).toBeLessThan(0.5)
  })

  it('clamps implausible factors and ignores outage days', () => {
    expect(fitCalibration(days(20, 3))!.factor).toBe(1.3)
    const withOutage = [...days(10, 0.9), { modelledKwh: 18, loggedKwh: 0.1 }]
    expect(fitCalibration(withOutage)!.days).toBe(10)
  })
})
