import { z } from 'zod'
import { calculatePaybackPeriod } from '@/lib/calculations/financial'

export const CalculatePaybackSchema = z.object({
  netInvestmentInr: z.number().min(1000).describe('Net system cost in INR after government subsidy'),
  firstYearAnnualSavingsInr: z.number().min(500).describe('First year electricity bill savings in INR'),
  tariffEscalationRate: z.number().min(0).max(0.15).default(0.04).describe('Annual grid tariff escalation rate'),
})

export type CalculatePaybackInput = z.infer<typeof CalculatePaybackSchema>

export async function calculatePaybackTool(input: CalculatePaybackInput) {
  const { netInvestmentInr, firstYearAnnualSavingsInr, tariffEscalationRate } = input

  const simplePaybackYears = parseFloat((netInvestmentInr / firstYearAnnualSavingsInr).toFixed(1))
  const dynamicPaybackYears = calculatePaybackPeriod(
    netInvestmentInr,
    firstYearAnnualSavingsInr,
    tariffEscalationRate
  )

  return {
    netInvestmentInr,
    firstYearSavingsInr: firstYearAnnualSavingsInr,
    simplePaybackPeriodYears: simplePaybackYears,
    dynamicPaybackPeriodYears: dynamicPaybackYears,
    roiFirstYearPercent: parseFloat(((firstYearAnnualSavingsInr / netInvestmentInr) * 100).toFixed(1)),
    verdict:
      dynamicPaybackYears <= 4.5
        ? 'Excellent payback (< 4.5 years)'
        : dynamicPaybackYears <= 6.5
          ? 'Good financial return (4.5 - 6.5 years)'
          : 'Moderate return (> 6.5 years)',
  }
}
