import { describe, it, expect } from 'vitest'
import {
  calculateNPV,
  calculate25YearSavings,
  calculatePaybackPeriod,
  calculatePMSuryaGharSubsidy,
  adjustForSubsidy,
} from './financial'

describe('Financial Calculation Engine', () => {
  it('calculates PM Surya Ghar subsidies correctly', () => {
    expect(calculatePMSuryaGharSubsidy(0.5)).toBe(15000)
    expect(calculatePMSuryaGharSubsidy(1)).toBe(30000)
    expect(calculatePMSuryaGharSubsidy(1.5)).toBe(45000)
    expect(calculatePMSuryaGharSubsidy(2.5)).toBe(69000)
    expect(calculatePMSuryaGharSubsidy(2)).toBe(60000)
    expect(calculatePMSuryaGharSubsidy(3)).toBe(78000)
    expect(calculatePMSuryaGharSubsidy(5)).toBe(78000)
    expect(calculatePMSuryaGharSubsidy(10)).toBe(78000)
  })

  it('adjusts gross cost by PM Surya Ghar subsidy correctly', () => {
    const res = adjustForSubsidy(195000, 3)
    expect(res.grossCost).toBe(195000)
    expect(res.subsidyAmount).toBe(78000)
    expect(res.netCost).toBe(117000)
  })

  it('calculates simple and dynamic payback period accurately', () => {
    const payback = calculatePaybackPeriod(117000, 32000, 0.03, 0.005)
    expect(payback).toBeGreaterThan(3.0)
    expect(payback).toBeLessThan(4.5)
  })

  it('calculates 25-year cumulative savings with degradation and tariff escalation', () => {
    const res = calculate25YearSavings({
      initialInvestment: 117000,
      annualSavings: 30000,
      degradationRate: 0.005,
      tariffEscalationRate: 0.03,
      years: 25,
    })

    expect(res.totalSavings).toBeGreaterThan(800000)
    expect(res.netProfit).toBeGreaterThan(700000)
    expect(res.cashflows.length).toBe(25)
    expect(res.cashflows[0].year).toBe(1)
    expect(res.cashflows[24].year).toBe(25)
  })

  it('calculates Net Present Value (NPV) correctly', () => {
    const npv = calculateNPV({
      initialInvestment: 120000,
      annualSavings: 30000,
      discountRate: 0.08,
      years: 25,
    })

    expect(npv.npv).toBeGreaterThan(0)
    expect(npv.isViable).toBe(true)
  })
})
