import { z } from 'zod'
import { calculateOptimalSystemSize } from '@/lib/calculations/systemSizing'

export const CompareSystemsSchema = z.object({
  monthlyUnitsKwh: z.number().min(50).describe('Monthly electricity consumption in kWh'),
  roofAreaSqft: z.number().optional().describe('Available shadow-free roof area in sq.ft'),
  capacitiesToCompare: z.array(z.number()).default([2, 3, 5, 7, 10]).describe('Array of capacities in kW to compare'),
})

export type CompareSystemsInput = z.infer<typeof CompareSystemsSchema>

export async function compareSystemsTool(input: CompareSystemsInput) {
  const sizing = calculateOptimalSystemSize({
    monthlyUnitsKwh: input.monthlyUnitsKwh,
    roofAreaSqft: input.roofAreaSqft,
  })

  return {
    userConsumptionKwhMonthly: input.monthlyUnitsKwh,
    availableRoofAreaSqft: input.roofAreaSqft ?? 'not provided',
    recommendedCapacityKw: sizing.recommendedCapacityKw,
    comparisonTable: sizing.comparisonOptions,
    analysis: `For a monthly usage of ${input.monthlyUnitsKwh} kWh, a ${sizing.recommendedCapacityKw} kW system offers the best balance of subsidy optimization, bill offset (${sizing.coveragePercentage}%), and a fast payback of ~${sizing.paybackPeriodYears} years.`,
  }
}
