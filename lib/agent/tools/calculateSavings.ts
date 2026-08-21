import { z } from 'zod'
import { calculateTelanganaTariff } from '@/lib/calculations/tariffs'

export const CalculateSavingsSchema = z.object({
  monthlyGenerationKwh: z.number().min(10).describe('Monthly solar energy generated in kWh'),
  monthlyConsumptionKwh: z.number().min(10).describe('Monthly household consumption in kWh'),
  currentMonthlyBillInr: z.number().optional().describe('Current monthly electricity bill in INR'),
})

export type CalculateSavingsInput = z.infer<typeof CalculateSavingsSchema>

export async function calculateSavingsTool(input: CalculateSavingsInput) {
  const { monthlyGenerationKwh, monthlyConsumptionKwh } = input

  const baselineTariff = calculateTelanganaTariff(monthlyConsumptionKwh, 'domestic')
  const netUnits = Math.max(0, monthlyConsumptionKwh - monthlyGenerationKwh)
  const postSolarTariff = calculateTelanganaTariff(netUnits, 'domestic')

  const monthlySavings = Math.max(0, baselineTariff.estimatedTotalBillInr - postSolarTariff.estimatedTotalBillInr)
  const annualSavings = Math.round(monthlySavings * 12)

  const excessExportedKwh = Math.max(0, monthlyGenerationKwh - monthlyConsumptionKwh)
  // Annual buyback settlement rate ~₹3.50/kWh under TGERC
  const annualExportCreditInr = Math.round(excessExportedKwh * 12 * 3.5)

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
  }
}
