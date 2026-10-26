import { z } from 'zod'
import { calculatePMSuryaGharSubsidy, PM_SURYA_GHAR } from '@/lib/calculations/financial'
import { SOLAR_COST_PER_KW_INR } from '@/lib/calculations/systemSizing'

export const CalculateSystemCostSchema = z.object({
  capacityKw: z.number().min(0.5).max(50).describe('System capacity in kW'),
  batteryStorage: z.boolean().default(false).describe('Whether battery energy storage is included'),
})

export type CalculateSystemCostInput = z.infer<typeof CalculateSystemCostSchema>

export async function calculateSystemCostTool(input: CalculateSystemCostInput) {
  const { capacityKw, batteryStorage } = input

  // Market estimate (not an official benchmark); battery cost is a rough indicative figure.
  const baseCostPerKw = SOLAR_COST_PER_KW_INR
  const grossSolarCost = Math.round(capacityKw * baseCostPerKw)
  const batteryCost = batteryStorage ? Math.round(capacityKw * 35000) : 0
  const totalGrossCost = grossSolarCost + batteryCost

  const subsidyAmount = calculatePMSuryaGharSubsidy(capacityKw)
  const netConsumerCost = Math.max(0, totalGrossCost - subsidyAmount)

  return {
    capacityKw,
    includesBattery: batteryStorage,
    costBreakdown: {
      solarModulesAndInverterInr: Math.round(grossSolarCost * 0.7),
      mountingStructureAndBosInr: Math.round(grossSolarCost * 0.2),
      installationTestingCommissioningInr: Math.round(grossSolarCost * 0.1),
      batteryStorageInr: batteryCost,
      totalGrossCostInr: totalGrossCost,
    },
    subsidyDetails: {
      scheme: 'PM Surya Ghar: Muft Bijli Yojana (Central Financial Assistance)',
      eligibleSubsidyInr: subsidyAmount,
      subsidyRule: '₹30,000/kW for the first 2 kW + ₹18,000 for the 3rd kW, capped at ₹78,000',
      subsidySource: PM_SURYA_GHAR.source,
      costIsEstimate: true,
    },
    netPayableCostInr: netConsumerCost,
  }
}
