import { z } from 'zod'
import {
  calculateTelanganaTariff,
  NET_METERING_SETTLEMENT_INR_PER_KWH,
  NET_METERING_SETTLEMENT_SOURCE,
  TARIFF_SOURCE,
} from '@/lib/calculations/tariffs'

export const GetTariffInformationSchema = z.object({
  monthlyUnitsKwh: z.number().min(0).describe('Monthly electricity consumption units in kWh (ask the user if unknown)'),
  category: z.enum(['domestic', 'commercial', 'industrial']).default('domestic').describe('Consumer tariff category'),
})

export type GetTariffInformationInput = z.infer<typeof GetTariffInformationSchema>

export async function getTariffInformationTool(input: GetTariffInformationInput) {
  if (input.category !== 'domestic') {
    return {
      supported: false,
      message: 'Only LT-I domestic tariffs are modelled. Point the user to the TGERC tariff order for other categories.',
      sourceUrl: TARIFF_SOURCE.url,
    }
  }
  const breakdown = calculateTelanganaTariff(input.monthlyUnitsKwh)

  return {
    jurisdiction: 'Telangana State (TSSPDCL & TSNPDCL)',
    regulatoryBody: 'Telangana State Electricity Regulatory Commission (TGERC)',
    category: input.category,
    subcategory: breakdown.subcategory,
    monthlyUnitsKwh: input.monthlyUnitsKwh,
    estimatedMonthlyBillInr: breakdown.estimatedTotalBillInr,
    effectiveRatePerKwhInr: breakdown.effectiveRatePerUnit,
    marginalRatePerKwhInr: breakdown.marginalRatePerUnit,
    slabBreakdown: breakdown.slabs,
    netMeteringSettlementRateInr: NET_METERING_SETTLEMENT_INR_PER_KWH,
    netMeteringSettlementSource: NET_METERING_SETTLEMENT_SOURCE,
    tariffSource: TARIFF_SOURCE,
    settlementCycle: 'Annual cycle from April 1st to March 31st',
  }
}
