import { z } from 'zod'
import { getUserConsumptionHistory, computeEnergyStatistics } from '@/lib/dal/analytics'

// The user is always the authenticated session user; the model cannot choose whose data to read.
export const GetConsumptionHistorySchema = z.object({})

export type GetConsumptionHistoryInput = z.infer<typeof GetConsumptionHistorySchema>

export async function getConsumptionHistoryTool(_input: GetConsumptionHistoryInput) {
  try {
    const history = await getUserConsumptionHistory()
    if (history.length === 0) {
      return {
        found: false,
        message: 'The user has not recorded any monthly bills yet. Ask them to add bills on the History page.',
      }
    }
    const stats = computeEnergyStatistics(history)
    return {
      found: true,
      totalMonthsRecorded: history.length,
      averageMonthlyConsumptionKwh: stats.averageMonthlyConsumption,
      highestMonthlyConsumptionKwh: stats.highestConsumption,
      highestMonth: stats.highestMonth,
      lowestMonthlyConsumptionKwh: stats.lowestConsumption,
      lowestMonth: stats.lowestMonth,
      averageMonthlyBillInr: stats.averageMonthlyBill,
      peakDemandAverageKw: stats.peakDemandAverageKw,
      yoyConsumptionChangePercent: stats.yoyConsumptionChangePercent,
      recentMonths: history.slice(-6).map((h) => ({
        month: `${h.month} ${h.year}`,
        consumptionKwh: h.consumptionKwh,
        billInr: h.billAmount,
      })),
    }
  } catch (error) {
    return { found: false, error: (error as Error).message }
  }
}
