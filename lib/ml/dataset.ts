import 'server-only'

import { getUserConsumptionHistory, getGenerationHistory } from '@/lib/dal/analytics'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { geocode, getMonthlyClimatology, type MonthlyClimate } from '@/lib/data/weather'
import type { MLDatasetExport, MLTrainingRecord } from './schema'

const FEATURE_NAMES = [
  'date',
  'month',
  'year',
  'consumption_kwh',
  'bill_amount_inr',
  'tariff_rate_inr',
  'peak_demand_kw',
  'solar_irradiance_ghi',
  'ambient_temperature_c',
  'generation_kwh',
  'source',
]

/**
 * Exports the user's real history, joined with measured monthly climatology (ERA5) and
 * logged generation, as a tabular training set for the external Python pipeline.
 * Rows lacking a measured climate value are omitted rather than imputed.
 */
export async function prepareMLTrainingDataset(
  userId: string,
  datasetType: 'consumption_forecast' | 'solar_generation_forecast' | 'energy_analysis' = 'consumption_forecast'
): Promise<MLDatasetExport> {
  const [history, profile, generation] = await Promise.all([
    getUserConsumptionHistory(userId),
    getSolarProfile(userId),
    getGenerationHistory(3650, userId),
  ])

  let climate: MonthlyClimate[] = []
  try {
    const coords = await geocode(profile?.city || 'Hyderabad', profile?.state)
    climate = await getMonthlyClimatology(coords)
  } catch {
    // Without climate features the export would be misleading; return no records.
  }

  const genByMonth = new Map<string, number>()
  for (const g of generation) {
    const key = g.recordDate.slice(0, 7)
    genByMonth.set(key, (genByMonth.get(key) ?? 0) + g.generationKwh)
  }

  const records: MLTrainingRecord[] = []
  for (const h of history) {
    const c = climate[Number(h.recordDate.slice(5, 7)) - 1]
    if (!c || c.ghiKwhM2Day === 0) continue
    records.push({
      date: h.recordDate,
      month: h.month,
      year: h.year,
      consumption_kwh: h.consumptionKwh,
      bill_amount_inr: h.billAmount,
      tariff_rate_inr: h.tariffRate ?? (h.consumptionKwh > 0 ? Number((h.billAmount / h.consumptionKwh).toFixed(2)) : 0),
      peak_demand_kw: h.peakDemandKw,
      solar_irradiance_ghi: c.ghiKwhM2Day,
      ambient_temperature_c: c.tempC,
      generation_kwh: genByMonth.get(h.recordDate.slice(0, 7)) ?? 0,
      source: h.source,
    })
  }

  return {
    user_id: userId,
    dataset_type: datasetType,
    exported_at: new Date().toISOString(),
    total_records: records.length,
    feature_names: FEATURE_NAMES,
    records,
  }
}
