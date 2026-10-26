import { describe, it, expect } from 'vitest'
import { calculateTelanganaTariff } from './tariffs'

describe('Telangana LT-I tariff (FY 2025-26 schedule, retained FY 2026-27)', () => {
  it('bills up to 100 units on the LT-I(A) ladder', () => {
    const t = calculateTelanganaTariff(80)
    expect(t.subcategory).toBe('LT-I(A)')
    expect(t.energyChargesInr).toBe(50 * 1.95 + 30 * 3.1)
    expect(t.fixedChargesInr).toBe(10)
  })

  it('bills 150 units entirely on the LT-I(B) ladder', () => {
    const t = calculateTelanganaTariff(150)
    expect(t.subcategory).toBe('LT-I(B)')
    expect(t.slabs.map((s) => [s.units, s.ratePerUnit])).toEqual([
      [100, 3.4],
      [50, 4.8],
    ])
    expect(t.energyChargesInr).toBe(100 * 3.4 + 50 * 4.8)
    expect(t.marginalRatePerUnit).toBe(4.8)
  })

  it('bills above 200 units on the LT-I(C) telescopic ladder', () => {
    const t = calculateTelanganaTariff(450)
    expect(t.subcategory).toBe('LT-I(C)')
    expect(t.energyChargesInr).toBe(200 * 5.1 + 100 * 7.7 + 100 * 9 + 50 * 9.5)
    expect(t.marginalRatePerUnit).toBe(9.5)
    expect(calculateTelanganaTariff(900).marginalRatePerUnit).toBe(10)
  })

  it('scales fixed charge with contracted load and handles zero units', () => {
    expect(calculateTelanganaTariff(300, { contractedLoadKw: 3 }).fixedChargesInr).toBe(30)
    const zero = calculateTelanganaTariff(0)
    expect(zero.energyChargesInr).toBe(0)
    expect(zero.effectiveRatePerUnit).toBeNull()
  })
})
