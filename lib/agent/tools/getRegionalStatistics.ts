import { z } from 'zod'
import { getRegionalStatistics } from '@/lib/dal/analytics'
import { geocode, getMonthlyClimatology } from '@/lib/data/weather'

export const GetRegionalStatisticsSchema = z.object({
  district: z.string().default('Hyderabad').describe('Telangana district or city name (e.g. Hyderabad, Warangal)'),
})

export type GetRegionalStatisticsInput = z.infer<typeof GetRegionalStatisticsSchema>

/** Measured climatology (ERA5 via Open-Meteo) plus any curated rows in public.regional_statistics. */
export async function getRegionalStatisticsTool(input: GetRegionalStatisticsInput) {
  const [curated, climate] = await Promise.allSettled([
    getRegionalStatistics(input.district),
    geocode(input.district, 'Telangana').then(async (c) => ({
      place: c.label,
      monthly: await getMonthlyClimatology(c),
    })),
  ])

  const stats = curated.status === 'fulfilled' ? curated.value : null
  const clim = climate.status === 'fulfilled' ? climate.value : null
  if (!stats && !clim) return { found: false, error: 'No regional data available for this district.' }

  return {
    found: true,
    climatology: clim
      ? {
          place: clim.place,
          source: 'ERA5 reanalysis via Open-Meteo (3-year monthly mean)',
          monthly: clim.monthly.map((m) => ({ month: m.month + 1, ghiKwhPerM2PerDay: m.ghiKwhM2Day, meanTempC: m.tempC })),
        }
      : null,
    curatedStatistics: stats
      ? {
          district: stats.district,
          recordDate: stats.recordDate,
          source: stats.source,
          averageMonthlyConsumptionKwh: stats.averageMonthlyConsumption,
          averageTariffInr: stats.averageElectricityTariff,
          averageRoofAreaSqft: stats.averageRoofArea,
          installedCapacityMw: stats.installedCapacityMw,
        }
      : null,
  }
}
