import { z } from 'zod'

export const CalculateSolarOutputSchema = z.object({
  capacityKw: z.number().min(0.5).max(100).describe('Solar system capacity in kilowatts (kW)'),
  dailySunlightHours: z.number().min(2).max(8).default(4.8).describe('Peak sun hours per day in location'),
  shadingLossPercentage: z.number().min(0).max(80).default(5).describe('Estimated shading loss percentage'),
})

export type CalculateSolarOutputInput = z.infer<typeof CalculateSolarOutputSchema>

export async function calculateSolarOutputTool(input: CalculateSolarOutputInput) {
  const { capacityKw, dailySunlightHours, shadingLossPercentage } = input
  const deratingFactor = (100 - shadingLossPercentage) / 100

  // System performance ratio (PR) ~ 0.78 for modern inverters & wiring in India
  const performanceRatio = 0.78
  const dailyKwh = parseFloat((capacityKw * dailySunlightHours * performanceRatio * deratingFactor).toFixed(2))
  const monthlyKwh = Math.round(dailyKwh * 30)
  const annualKwh = Math.round(dailyKwh * 365)
  const capacityUtilizationFactor = parseFloat(((annualKwh / (capacityKw * 8760)) * 100).toFixed(1))

  return {
    capacityKw,
    dailyGenerationKwh: dailyKwh,
    monthlyGenerationKwh: monthlyKwh,
    annualGenerationKwh: annualKwh,
    capacityUtilizationFactorPercent: capacityUtilizationFactor,
    assumptions: {
      location: 'Hyderabad, Telangana',
      peakSunHoursDaily: dailySunlightHours,
      systemPerformanceRatio: performanceRatio,
      shadingLossPercent: shadingLossPercentage,
    },
  }
}
