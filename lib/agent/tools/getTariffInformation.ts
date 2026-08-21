import { z } from 'zod'
import { calculateTelanganaTariff } from '@/lib/calculations/tariffs'

export const GetTariffInformationSchema = z.object({
  monthlyUnitsKwh: z.number().min(0).default(300).describe('Monthly electricity consumption units in kWh'),
  category: z.enum(['domestic', 'commercial', 'industrial']).default('domestic').describe('Consumer tariff category'),
})

export type GetTariffInformationInput = z.infer<typeof GetTariffInformationSchema>

export async function getTariffInformationTool(input: GetTariffInformationInput) {
  const breakdown = calculateTelanganaTariff(input.monthlyUnitsKwh, input.category)

  return {
    jurisdiction: 'Telangana State (TSSPDCL & TSNPDCL)',
    regulatoryBody: 'Telangana State Electricity Regulatory Commission (TGERC)',
    category: input.category,
    monthlyUnitsKwh: input.monthlyUnitsKwh,
    estimatedMonthlyBillInr: breakdown.estimatedTotalBillInr,
    effectiveRatePerKwhInr: breakdown.effectiveRatePerUnit,
    slabBreakdown: breakdown.slabs,
    netMeteringSettlementRateInr: 3.5, // TGERC benchmark annual settlement rate
    settlementCycle: 'Annual cycle from April 1st to March 31st',
  }
}
