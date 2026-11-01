import { z } from 'zod'
import { getGenerationHistory, getUserConsumptionHistory, computeEnergyStatistics } from '@/lib/dal/analytics'
import { listDevices } from '@/lib/dal/devices'

// Always the signed-in user's data; the model cannot choose whose records to read.
export const GetEnergySummarySchema = z.object({})

/** The user's own recorded generation, grid exchange, bills and devices for the last 30 days. */
export async function getEnergySummaryTool() {
  const [generation, consumption, devices] = await Promise.all([
    getGenerationHistory(30),
    getUserConsumptionHistory(),
    listDevices().catch(() => []),
  ])
  const stats = computeEnergyStatistics(consumption)
  const total = generation.reduce((a, g) => a + g.generationKwh, 0)
  const exported = generation.reduce((a, g) => a + g.exportedKwh, 0)
  const imported = generation.reduce((a, g) => a + g.gridImportKwh, 0)
  const best = [...generation].sort((a, b) => b.generationKwh - a.generationKwh)[0]
  const worst = [...generation].sort((a, b) => a.generationKwh - b.generationKwh)[0]

  return {
    daysWithReadings: generation.length,
    totalGenerationKwh: Math.round(total * 10) / 10,
    averageDailyKwh: generation.length ? Math.round((total / generation.length) * 100) / 100 : null,
    exportedKwh: Math.round(exported * 10) / 10,
    importedKwh: Math.round(imported * 10) / 10,
    bestDay: best ? { date: best.recordDate, kwh: best.generationKwh } : null,
    lowestDay: worst ? { date: worst.recordDate, kwh: worst.generationKwh } : null,
    sources: [...new Set(generation.map((g) => g.source))],
    devices: devices.map((d) => ({ name: d.name, kind: d.kind, status: d.status, simulated: d.protocol === 'simulator' })),
    billsOnRecord: stats.totalRecords,
    averageMonthlyConsumptionKwh: stats.averageMonthlyConsumption,
    daily: generation.map((g) => ({ date: g.recordDate, kwh: g.generationKwh })),
    note: generation.length === 0 ? 'No readings recorded yet. Ask the user to log readings or connect a device.' : undefined,
  }
}
