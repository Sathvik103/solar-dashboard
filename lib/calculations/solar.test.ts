import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateROI, generateBreakevenCurves } from './solar'

// ---------------------------------------------------------------------------
// Property 1: Daily generation is non-negative for all positive inputs
// Req 3.1 — formula: (panels × wattage × sunHours) / 1000
// ---------------------------------------------------------------------------
describe('calculateROI — generation is non-negative', () => {
  it('dailyGeneration >= 0 for all positive inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),         // numberOfPanels
        fc.double({ min: 0.1, max: 1000, noNaN: true }), // panelWattage
        fc.double({ min: 0.1, max: 12, noNaN: true }),   // dailySunlightHours
        fc.double({ min: 0.1, max: 50, noNaN: true }),   // electricityRate
        fc.integer({ min: 1000, max: 50000 }),           // costPerPanel
        (numberOfPanels, panelWattage, dailySunlightHours, electricityRate, costPerPanel) => {
          const result = calculateROI({
            numberOfPanels,
            costPerPanel,
            dailySunlightHours,
            electricityRate,
            panelWattage,
          })
          return result.dailyGeneration >= 0
        }
      )
    )
  })
})

// ---------------------------------------------------------------------------
// Property 2: Daily savings = dailyGeneration × electricityRate
// Req 3.2 — no silent rounding beyond two decimal places
// ---------------------------------------------------------------------------
describe('calculateROI — daily savings match generation × tariff', () => {
  it('dailySavings === round2(dailyGeneration × electricityRate)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.double({ min: 100, max: 600, noNaN: true }),
        fc.double({ min: 1, max: 10, noNaN: true }),
        fc.double({ min: 1, max: 20, noNaN: true }),
        fc.integer({ min: 5000, max: 30000 }),
        (numberOfPanels, panelWattage, dailySunlightHours, electricityRate, costPerPanel) => {
          const result = calculateROI({
            numberOfPanels,
            costPerPanel,
            dailySunlightHours,
            electricityRate,
            panelWattage,
          })
          const expected = parseFloat(
            (result.dailyGeneration * electricityRate).toFixed(2)
          )
          return Math.abs(result.dailySavings - expected) < 0.01
        }
      )
    )
  })
})

// ---------------------------------------------------------------------------
// Property 3: Breakeven decreases (or stays equal) as monthly savings increase
// Req 3.3 — higher electricityRate → shorter or equal breakeven
// ---------------------------------------------------------------------------
describe('calculateROI — breakeven decreases monotonically as savings increase', () => {
  it('higher electricityRate => breakEvenMonths <= lower electricityRate result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.double({ min: 100, max: 500, noNaN: true }),
        fc.double({ min: 1, max: 8, noNaN: true }),
        fc.double({ min: 1, max: 10, noNaN: true }),    // lower rate
        fc.double({ min: 10, max: 20, noNaN: true }),   // higher rate (strictly > lower band)
        fc.integer({ min: 5000, max: 20000 }),
        (numberOfPanels, panelWattage, dailySunlightHours, lowerRate, higherRate, costPerPanel) => {
          const resultLow = calculateROI({
            numberOfPanels, costPerPanel, dailySunlightHours,
            electricityRate: lowerRate, panelWattage,
          })
          const resultHigh = calculateROI({
            numberOfPanels, costPerPanel, dailySunlightHours,
            electricityRate: higherRate, panelWattage,
          })
          return resultHigh.breakEvenMonths <= resultLow.breakEvenMonths
        }
      )
    )
  })
})

// ---------------------------------------------------------------------------
// Property 4: Net position at breakEvenMonths is within ±(one month's savings) of zero
// Req 3.4 — the breakeven month is not off by more than one period
// ---------------------------------------------------------------------------
describe('calculateROI — net position at breakeven approximates zero', () => {
  it('cumulative savings at breakEvenMonths >= totalInvestment', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.double({ min: 200, max: 500, noNaN: true }),
        fc.double({ min: 3, max: 8, noNaN: true }),
        fc.double({ min: 4, max: 12, noNaN: true }),
        fc.integer({ min: 5000, max: 20000 }),
        (numberOfPanels, panelWattage, dailySunlightHours, electricityRate, costPerPanel) => {
          const result = calculateROI({
            numberOfPanels, costPerPanel, dailySunlightHours,
            electricityRate, panelWattage,
          })
          // At breakEvenMonths, cumulative savings should cover the investment
          const cumulativeAtBreakeven = result.monthlySavings * result.breakEvenMonths
          const tolerance = result.monthlySavings // ±one month
          return cumulativeAtBreakeven >= result.totalInvestment - tolerance
        }
      )
    )
  })
})

// ---------------------------------------------------------------------------
// Concrete regression: example from existing calculator defaults
// ---------------------------------------------------------------------------
describe('calculateROI — concrete example', () => {
  it('10 panels × 400W × 5.5h @ ₹6.30 produces expected output', () => {
    const result = calculateROI({
      numberOfPanels: 10,
      costPerPanel: 12000,
      dailySunlightHours: 5.5,
      electricityRate: 6.30,
      panelWattage: 400,
    })
    expect(result.totalInvestment).toBe(120000)
    expect(result.dailyGeneration).toBe(22)       // (10 × 400 × 5.5) / 1000
    expect(result.dailySavings).toBeCloseTo(138.6, 1)
    expect(result.breakEvenMonths).toBeGreaterThan(0)
    expect(result.breakEvenYears).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// generateBreakevenCurves — basic shape invariants
// ---------------------------------------------------------------------------
describe('generateBreakevenCurves — output shape', () => {
  const panels = [
    { name: 'TestPanel', wattage: 400, costPerPanel: 12000 },
  ]

  it('returns exactly 121 data points (month 0 through 120)', () => {
    const data = generateBreakevenCurves(10, 5.5, 6.30, panels)
    expect(data).toHaveLength(121)
    expect(data[0].month).toBe(0)
    expect(data[120].month).toBe(120)
  })

  it('first month net position equals negative total investment', () => {
    const data = generateBreakevenCurves(10, 5.5, 6.30, panels)
    // month 0: 0 savings - investment = -investment
    expect(data[0]['TestPanel']).toBe(-120000)
  })

  it('net position increases monotonically over time', () => {
    const data = generateBreakevenCurves(10, 5.5, 6.30, panels)
    for (let i = 1; i < data.length; i++) {
      expect(data[i]['TestPanel']).toBeGreaterThan(data[i - 1]['TestPanel'])
    }
  })
})
