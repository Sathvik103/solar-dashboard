import 'server-only'

import { getSolarProfile } from '@/lib/dal/solar-profiles'
import {
  getActiveSolarSystem,
  getGenerationHistory,
  getUserConsumptionHistory,
  computeEnergyStatistics,
} from '@/lib/dal/analytics'
import {
  geocode,
  getArchivedHourlyWeather,
  getHourlyWeather,
  WeatherUnavailableError,
  type Coordinates,
} from '@/lib/data/weather'
import { estimateHourlyPower, shadingFactorFor, sumEnergyKwh, type PvSystem } from '@/lib/solar/pvModel'
import { calculateOptimalSystemSize } from '@/lib/calculations/systemSizing'
import { calculateTelanganaTariff } from '@/lib/calculations/tariffs'
import type { SolarProfile } from '@/lib/types/user'

export type HourlyPoint = { hour: string; output: number }

export type DailyPoint = {
  date: string
  loggedKwh: number | null
  modelledKwh: number | null
  savedInr: number | null
}

export type SystemBasis =
  | { kind: 'installed'; capacityKw: number }
  | { kind: 'preferred'; capacityKw: number }
  | { kind: 'recommended'; capacityKw: number }

export type DashboardOverview = {
  profile: SolarProfile | null
  location: Coordinates | null
  basis: SystemBasis | null
  weather: { available: boolean; error?: string }
  today: {
    hourly: HourlyPoint[]
    modelledKwh: number | null
    currentKw: number | null
    loggedKwh: number | null
  }
  tariffInrPerKwh: number | null
  tariffSource: 'profile' | 'bill-history' | 'slab-model' | null
  stats: ReturnType<typeof computeEnergyStatistics>
  sizing: ReturnType<typeof calculateOptimalSystemSize> | null
  hasConsumptionData: boolean
  daily: DailyPoint[]
  grid: { exportedKwh: number; importedKwh: number; days: number } | null
}

const IST_OFFSET_MS = 5.5 * 3600 * 1000

export function istNow(now = new Date()): Date {
  return new Date(now.getTime() + IST_OFFSET_MS)
}

export function istDateString(now = new Date()): string {
  return istNow(now).toISOString().slice(0, 10)
}

function hourLabel(isoLocal: string): string {
  const h = Number(isoLocal.slice(11, 13))
  const suffix = h >= 12 ? 'pm' : 'am'
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`
}

function pickTariff(
  profile: SolarProfile | null,
  stats: ReturnType<typeof computeEnergyStatistics>,
  monthlyUnits: number | null
): { rate: number | null; source: DashboardOverview['tariffSource'] } {
  if (profile?.electricityTariffInr) return { rate: profile.electricityTariffInr, source: 'profile' }
  const avgUnits = stats.averageMonthlyConsumption
  const avgBill = stats.averageMonthlyBill
  if (avgUnits && avgBill) return { rate: Number((avgBill / avgUnits).toFixed(2)), source: 'bill-history' }
  if (monthlyUnits) return { rate: calculateTelanganaTariff(monthlyUnits).effectiveRatePerUnit, source: 'slab-model' }
  return { rate: null, source: null }
}

export async function buildDashboardOverview(userId: string): Promise<DashboardOverview> {
  const [profile, history, generation, system] = await Promise.all([
    getSolarProfile(userId),
    getUserConsumptionHistory(userId),
    getGenerationHistory(30, userId),
    getActiveSolarSystem(userId),
  ])

  const stats = computeEnergyStatistics(history)
  const recent = history.slice(-12)
  const recentAvgUnits = recent.length
    ? Math.round(recent.reduce((a, r) => a + r.consumptionKwh, 0) / recent.length)
    : null
  const monthlyUnits = recentAvgUnits ?? profile?.monthlyUnitsKwh ?? null

  const sizing = monthlyUnits
    ? calculateOptimalSystemSize({
        monthlyUnitsKwh: monthlyUnits,
        monthlyBillInr: profile?.monthlyBillInr ?? undefined,
        roofAreaSqft: profile?.roofAreaSqft ?? undefined,
        shadingLevel: profile?.shadingLevel ?? undefined,
      })
    : null

  const basis: SystemBasis | null = system
    ? { kind: 'installed', capacityKw: system.capacityKw }
    : profile?.preferredCapacityKw
      ? { kind: 'preferred', capacityKw: profile.preferredCapacityKw }
      : sizing
        ? { kind: 'recommended', capacityKw: sizing.recommendedCapacityKw }
        : null

  const tariff = pickTariff(profile, stats, monthlyUnits)
  const todayIst = istDateString()
  const loggedToday = generation.find((g) => g.recordDate === todayIst)?.generationKwh ?? null

  const base: DashboardOverview = {
    profile,
    location: null,
    basis,
    weather: { available: false },
    today: { hourly: [], modelledKwh: null, currentKw: null, loggedKwh: loggedToday },
    tariffInrPerKwh: tariff.rate,
    tariffSource: tariff.source,
    stats,
    sizing,
    hasConsumptionData: history.length > 0,
    daily: [],
    grid: generation.length
      ? {
          exportedKwh: round(generation.reduce((a, g) => a + g.exportedKwh, 0)),
          importedKwh: round(generation.reduce((a, g) => a + g.gridImportKwh, 0)),
          days: generation.length,
        }
      : null,
  }

  if (!basis) {
    base.daily = dailyFromLogs(generation, tariff.rate, new Map())
    return base
  }

  const pv: PvSystem = {
    capacityKw: basis.capacityKw,
    shadingFactor: shadingFactorFor(profile?.shadingLevel),
    inverterCapacityKw: system?.inverterCapacityKw ?? undefined,
    systemAgeYears: system?.installationDate
      ? Math.max(0, (Date.now() - Date.parse(system.installationDate)) / (365.25 * 24 * 3600 * 1000))
      : 0,
  }
  const surface = { orientation: profile?.roofOrientation }

  try {
    const coords = await geocode(profile?.city || 'Hyderabad', profile?.state)
    base.location = coords

    const thirtyAgo = istDateString(new Date(Date.now() - 31 * 24 * 3600 * 1000))
    const yesterday = istDateString(new Date(Date.now() - 24 * 3600 * 1000))
    const [forecast, archive] = await Promise.all([
      getHourlyWeather(coords, surface, { forecastDays: 1 }),
      getArchivedHourlyWeather(coords, thirtyAgo, yesterday, surface).catch(() => []),
    ])

    const power = estimateHourlyPower(forecast, pv)
    const todays = power.filter((p) => p.time.startsWith(todayIst))
    const daylight = todays.filter((p) => p.kw > 0)
    const first = todays.findIndex((p) => p.kw > 0)
    const lastIdx = todays.length - 1 - [...todays].reverse().findIndex((p) => p.kw > 0)
    const window = daylight.length ? todays.slice(Math.max(0, first - 1), Math.min(todays.length, lastIdx + 2)) : []

    const nowHour = istNow().toISOString().slice(0, 13)
    const current = todays.find((p) => p.time.slice(0, 13) === nowHour)

    base.weather = { available: true }
    base.today = {
      hourly: window.map((p) => ({ hour: hourLabel(p.time), output: p.kw })),
      modelledKwh: sumEnergyKwh(todays),
      currentKw: current?.kw ?? null,
      loggedKwh: loggedToday,
    }

    const modelledByDay = new Map<string, number>()
    const archivePower = estimateHourlyPower(archive, pv)
    for (const p of archivePower) {
      const d = p.time.slice(0, 10)
      modelledByDay.set(d, (modelledByDay.get(d) ?? 0) + p.kw)
    }
    base.daily = dailyFromLogs(generation, tariff.rate, modelledByDay)
  } catch (err) {
    if (!(err instanceof WeatherUnavailableError)) throw err
    base.weather = { available: false, error: err.message }
    base.daily = dailyFromLogs(generation, tariff.rate, new Map())
  }

  return base
}

export function dailyFromLogs(
  generation: { recordDate: string; generationKwh: number }[],
  tariff: number | null,
  modelledByDay: Map<string, number>
): DailyPoint[] {
  const logged = new Map(generation.map((g) => [g.recordDate, g.generationKwh]))
  const dates = new Set([...logged.keys(), ...modelledByDay.keys()])
  return [...dates]
    .sort()
    .map((date) => {
      const l = logged.get(date) ?? null
      const m = modelledByDay.get(date)
      return {
        date,
        loggedKwh: l,
        modelledKwh: m != null ? round(m) : null,
        savedInr: l != null && tariff != null ? round(l * tariff) : null,
      }
    })
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
