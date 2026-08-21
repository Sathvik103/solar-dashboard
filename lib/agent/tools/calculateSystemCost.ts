import { z } from 'zod'
import { calculatePMSuryaGharSubsidy } from '@/lib/calculations/financial'

export const CalculateSystemCostSchema = z.object({
  capacityKw: z.number().min(0.5).max(50).describe('System capacity in kW'),
  batteryStorage: z.boolean().default(false).describe('Whether battery energy storage is included'),
})

export type CalculateSystemCostInput = z.infer<typeof CalculateSystemCostSchema>

export async function calculateSystemCostTool(input: CalculateSystemCostInput) {
  const { capacityKw, batteryStorage } = input

  // Benchmark capital costs in Telangana (₹/kW)
  const baseCostPerKw = 62000
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
      subsidyPerKwRate: capacityKw <= 2 ? '₹30,000 / kW' : '₹78,000 flat for ≥ 3 kW',
    },
    netPayableCostInr: netConsumerCost,
  }
}
