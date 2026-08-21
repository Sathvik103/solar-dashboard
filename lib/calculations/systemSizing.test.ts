import { describe, it, expect } from 'vitest'
import { calculateOptimalSystemSize } from './systemSizing'

describe('Solar System Sizing Recommender', () => {
  it('sizes a system to cover ~90-100% of 350 kWh monthly consumption', () => {
    const sizing = calculateOptimalSystemSize({
      monthlyUnitsKwh: 350,
      monthlyBillInr: 2800,
      roofAreaSqft: 800,
    })

    expect(sizing.recommendedCapacityKw).toBe(3)
    expect(sizing.subsidyAmountInr).toBe(78000)
    expect(sizing.netCostInr).toBeLessThan(sizing.estimatedGrossCostInr)
    expect(sizing.isRoofSufficient).toBe(true)
    expect(sizing.paybackPeriodYears).toBeGreaterThan(2.5)
    expect(sizing.paybackPeriodYears).toBeLessThan(5.5)
    expect(sizing.annualCo2AvoidedKg).toBeGreaterThan(2000)
    expect(sizing.comparisonOptions.length).toBe(5)
  })

  it('respects roof area constraints when roof space is tight', () => {
    const sizing = calculateOptimalSystemSize({
      monthlyUnitsKwh: 800,
      roofAreaSqft: 180, // only enough for ~2 kW
    })

    expect(sizing.maximumCapacityByRoofKw).toBe(2)
    expect(sizing.recommendedCapacityKw).toBe(2)
  })
})
