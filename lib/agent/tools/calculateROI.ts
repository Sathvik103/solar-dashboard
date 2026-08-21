import { z } from 'zod'
import { calculateNPV, calculate25YearSavings } from '@/lib/calculations/financial'

export const CalculateROISchema = z.object({
  netInvestmentInr: z.number().min(1000).describe('Net system investment in INR'),
  annualSavingsInr: z.number().min(500).describe('First year bill savings in INR'),
  discountRate: z.number().min(0.01).max(0.2).default(0.08).describe('Discount rate for NPV (e.g. 8%)'),
})

export type CalculateROIInput = z.infer<typeof CalculateROISchema>

export async function calculateROITool(input: CalculateROIInput) {
  const { netInvestmentInr, annualSavingsInr, discountRate } = input

  const npvResult = calculateNPV({
    initialInvestment: netInvestmentInr,
    annualSavings: annualSavingsInr,
    discountRate,
    years: 25,
  })

  const savings25 = calculate25YearSavings({
    initialInvestment: netInvestmentInr,
    annualSavings: annualSavingsInr,
    degradationRate: 0.005,
    tariffEscalationRate: 0.03,
    years: 25,
  })

  return {
    initialInvestmentInr: netInvestmentInr,
    firstYearSavingsInr: annualSavingsInr,
    lifetime25YearTotalSavingsInr: savings25.totalSavings,
    lifetimeNetProfitInr: savings25.netProfit,
    netPresentValueInr: npvResult.npv,
    isFinanciallyViable: npvResult.isViable,
    lifetimeBenefitCostRatio: parseFloat((savings25.totalSavings / netInvestmentInr).toFixed(2)),
  }
}
