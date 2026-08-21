import { describe, it, expect } from 'vitest'
import { calculateTelanganaTariff } from './tariffs'

describe('Telangana Tariff Calculation Engine', () => {
  it('computes telescopic domestic slabs for 150 kWh', () => {
    const tariff = calculateTelanganaTariff(150, 'domestic')
    expect(tariff.monthlyUnitsKwh).toBe(150)
    expect(tariff.slabs.length).toBe(2)
    expect(tariff.slabs[0].units).toBe(100)
    expect(tariff.slabs[0].ratePerUnit).toBe(3.4)
    expect(tariff.slabs[1].units).toBe(50)
    expect(tariff.slabs[1].ratePerUnit).toBe(4.8)
    expect(tariff.energyChargesInr).toBe(100 * 3.4 + 50 * 4.8)
    expect(tariff.estimatedTotalBillInr).toBeGreaterThan(tariff.energyChargesInr)
  })

  it('computes higher consumption domestic slabs for 450 kWh', () => {
    const tariff = calculateTelanganaTariff(450, 'domestic')
    expect(tariff.slabs.length).toBe(5)
    expect(tariff.energyChargesInr).toBeGreaterThan(2000)
    expect(tariff.effectiveRatePerUnit).toBeGreaterThan(6.0)
  })

  it('handles zero or negative units gracefully', () => {
    const tariff = calculateTelanganaTariff(0, 'domestic')
    expect(tariff.energyChargesInr).toBe(0)
    expect(tariff.estimatedTotalBillInr).toBe(80) // Fixed charges
  })
})
