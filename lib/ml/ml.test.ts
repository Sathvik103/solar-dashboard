import { describe, it, expect } from 'vitest'
import { extractSolarFeatureVector } from './features'
import { predictMonthlySolarOutput } from './model'
import { runSolarMLInference } from './inference'

describe('Solar Machine Learning Module', () => {
  it('extracts normalized feature vectors of correct length', () => {
    const f = extractSolarFeatureVector({
      capacityKw: 5,
      roofAreaSqft: 500,
      monthIndex: 4, // May
      orientation: 'south',
      shadingLevel: 'none',
    })

    expect(f.length).toBe(6)
    expect(f[0]).toBe(5) // 5 kW
    expect(f[3]).toBe(1.0) // South
  })

  it('predicts reasonable monthly generation using the regression model', () => {
    const f = extractSolarFeatureVector({
      capacityKw: 3,
      roofAreaSqft: 300,
      monthIndex: 2, // March
    })

    const predKwh = predictMonthlySolarOutput(f)
    expect(predKwh).toBeGreaterThan(250)
    expect(predKwh).toBeLessThan(550)
  })

  it('runs full 12-month solar ML inference curve with confidence bounds', () => {
    const result = runSolarMLInference({
      capacityKw: 4,
      roofAreaSqft: 400,
    })

    expect(result.capacityKw).toBe(4)
    expect(result.monthlyCurve.length).toBe(12)
    expect(result.predictedAnnualKwh).toBeGreaterThan(4500)
    expect(result.predictedAnnualKwh).toBeLessThan(7500)

    for (const point of result.monthlyCurve) {
      expect(point.lowerBoundKwh).toBeLessThanOrEqual(point.monthlyKwh)
      expect(point.upperBoundKwh).toBeGreaterThanOrEqual(point.monthlyKwh)
    }
  })
})
