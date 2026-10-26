import { z } from 'zod'
import {
  calculateTelanganaTariff,
  NET_METERING_SETTLEMENT_INR_PER_KWH,
  NET_METERING_SETTLEMENT_SOURCE,
  TARIFF_SOURCE,
} from '@/lib/calculations/tariffs'

export const CalculateSavingsSchema = z.object({
  monthlyGenerationKwh: z.number().min(10).describe('Monthly solar energy generated in kWh'),
  monthlyConsumptionKwh: z.number().min(10).describe('Monthly household consumption in kWh'),
  currentMonthlyBillInr: z.number().optional().describe('Current monthly electricity bill in INR'),
})

export type CalculateSavingsInput = z.infer<typeof CalculateSavingsSchema>

export async function calculateSavingsTool(input: CalculateSavingsInput) {
  const { monthlyGenerationKwh, monthlyConsumptionKwh } = input

  const baselineTariff = calculateTelanganaTariff(monthlyConsumptionKwh)
  const netUnits = Math.max(0, monthlyConsumptionKwh - monthlyGenerationKwh)
  const postSolarTariff = calculateTelanganaTariff(netUnits)

  const monthlySavings = Math.max(0, baselineTariff.estimatedTotalBillInr - postSolarTariff.estimatedTotalBillInr)
  const annualSavings = Math.round(monthlySavings * 12)

  const excessExportedKwh = Math.max(0, monthlyGenerationKwh - monthlyConsumptionKwh)
  // Year-end surplus is settled at the TGERC Average Pooled Power Purchase Cost.
  const annualExportCreditInr = Math.round(excessExportedKwh * 12 * NET_METERING_SETTLEMENT_INR_PER_KWH)

  return {
    monthlyConsumptionKwh,
    monthlySolarGenerationKwh: monthlyGenerationKwh,
    preSolarMonthlyBillInr: baselineTariff.estimatedTotalBillInr,
    postSolarMonthlyBillInr: postSolarTariff.estimatedTotalBillInr,
    monthlySavingsInr: Math.round(monthlySavings),
    annualSavingsInr: annualSavings,
    excessSolarExportedKwhPerMonth: excessExportedKwh,
    potentialAnnualExportCreditInr: annualExportCreditInr,
    billReductionPercentage: Math.round((monthlySavings / (baselineTariff.estimatedTotalBillInr || 1)) * 100),
    tariffSource: TARIFF_SOURCE.schedule,
    billExcludes: TARIFF_SOURCE.excludes,
    exportSettlementSource: NET_METERING_SETTLEMENT_SOURCE,
  }
}
