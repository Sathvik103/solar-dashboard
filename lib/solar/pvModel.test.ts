import { describe, it, expect } from 'vitest'
import { estimatePowerKw, estimateHourlyPower, sumEnergyKwh, shadingFactorFor } from './pvModel'

describe('pvModel', () => {
  it('produces zero at night', () => {
    expect(estimatePowerKw({ poaWm2: 0, tempC: 25 }, { capacityKw: 5 })).toBe(0)
  })

  it('is close to losses-adjusted nameplate at STC-like conditions', () => {
    const kw = estimatePowerKw({ poaWm2: 1000, tempC: 15 }, { capacityKw: 5 })
    expect(kw).toBeGreaterThan(3.8)
    expect(kw).toBeLessThanOrEqual(5)
  })

  it('derates with heat and shading, and clips to inverter capacity', () => {
    const cool = estimatePowerKw({ poaWm2: 800, tempC: 20 }, { capacityKw: 5 })
    const hot = estimatePowerKw({ poaWm2: 800, tempC: 40 }, { capacityKw: 5 })
    const shaded = estimatePowerKw({ poaWm2: 800, tempC: 20 }, { capacityKw: 5, shadingFactor: 0.7 })
    expect(hot).toBeLessThan(cool)
    expect(shaded).toBeCloseTo(cool * 0.7, 5)
    expect(estimatePowerKw({ poaWm2: 1200, tempC: 5 }, { capacityKw: 5, inverterCapacityKw: 3 })).toBe(3)
  })

  it('sums hourly energy', () => {
    const p = estimateHourlyPower(
      [
        { time: '2026-01-01T11:00', poaWm2: 800, tempC: 25 },
        { time: '2026-01-01T12:00', poaWm2: 900, tempC: 28 },
      ],
      { capacityKw: 3 }
    )
    expect(sumEnergyKwh(p)).toBeCloseTo(p[0].kw + p[1].kw, 2)
  })

  it('maps shading levels', () => {
    expect(shadingFactorFor('heavy')).toBe(0.7)
    expect(shadingFactorFor(null)).toBe(1)
  })
})
