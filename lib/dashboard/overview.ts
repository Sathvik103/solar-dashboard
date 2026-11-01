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
import { summariseGrid, type GridSummary } from './grid'
import { fitCalibration, type Calibration } from '@/lib/solar/calibration'
import { listDevices } from '@/lib/dal/devices'
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
  grid: GridSummary | null
  /** Fit of the weather model to the user's logged days (null until enough days are logged). */
  calibration: Calibration | null
  /** Measured output from online inverters, when any are reporting. */
  live: { powerKw: number; devices: number; lastSeenAt: string; simulated: boolean } | null
  monthToDate: { loggedKwh: number; savedInr: number | null; days: number } | null
  /** Current LT-I bill estimate from average units, using the sanctioned load for the fixed charge. */
  billEstimate: {
    monthlyUnits: number
    totalInr: number
    subcategory: string
    fixedChargeBasis: 'sanctioned-load' | 'minimum-1kw'
  } | null
  /** Set when the solar size under consideration exceeds the sanctioned connection load. */
  loadCheck: { sanctionedLoadKw: number; capacityKw: number; exceeds: boolean } | null
}

const IST_OFFSET_MS = 5.5 * 3600 * 1000
/** Days of history used to calibrate the model; the UI shows the most recent DISPLAY_DAYS. */
const CALIBRATION_WINDOW_DAYS = 90
const DISPLAY_DAYS = 30

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
  // Solar offsets the most expensive units first, so the marginal slab rate is the right saving per kWh.
  if (monthlyUnits) return { rate: calculateTelanganaTariff(monthlyUnits).marginalRatePerUnit, source: 'slab-model' }
  return { rate: null, source: null }
}

export async function buildDashboardOverview(userId: string): Promise<DashboardOverview> {
  const [profile, history, generation, system, devices] = await Promise.all([
    getSolarProfile(userId),
    getUserConsumptionHistory(userId),
    getGenerationHistory(CALIBRATION_WINDOW_DAYS, userId),
    getActiveSolarSystem(userId),
    listDevices(userId).catch(() => []),
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
  const displayFrom = istDateString(new Date(Date.now() - DISPLAY_DAYS * 24 * 3600 * 1000))
  const recentGeneration = generation.filter((g) => g.recordDate >= displayFrom)
  const monthPrefix = todayIst.slice(0, 7)
  const thisMonth = generation.filter((g) => g.recordDate.startsWith(monthPrefix))
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
    grid: summariseGrid(recentGeneration),
    calibration: null,
    live: summariseLive(devices),
    monthToDate: thisMonth.length
      ? {
          loggedKwh: round(thisMonth.reduce((a, g) => a + g.generationKwh, 0)),
          savedInr:
            tariff.rate != null ? round(thisMonth.reduce((a, g) => a + g.selfConsumedKwh, 0) * tariff.rate) : null,
          days: thisMonth.length,
        }
      : null,
    billEstimate: monthlyUnits
      ? (() => {
          const bill = calculateTelanganaTariff(monthlyUnits, {
            contractedLoadKw: profile?.sanctionedLoadKw ?? undefined,
          })
          return {
            monthlyUnits,
            totalInr: bill.estimatedTotalBillInr,
            subcategory: bill.subcategory,
            fixedChargeBasis: profile?.sanctionedLoadKw ? ('sanctioned-load' as const) : ('minimum-1kw' as const),
          }
        })()
      : null,
    loadCheck:
      profile?.sanctionedLoadKw && basis
        ? {
            sanctionedLoadKw: profile.sanctionedLoadKw,
            capacityKw: basis.capacityKw,
            exceeds: basis.capacityKw > profile.sanctionedLoadKw,
          }
        : null,
  }

  if (!basis) {
    base.daily = dailyFromLogs(recentGeneration, tariff.rate, new Map())
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

    const windowStart = istDateString(new Date(Date.now() - (CALIBRATION_WINDOW_DAYS + 1) * 24 * 3600 * 1000))
    const yesterday = istDateString(new Date(Date.now() - 24 * 3600 * 1000))
    const [forecast, archive] = await Promise.all([
      getHourlyWeather(coords, surface, { forecastDays: 1 }),
      getArchivedHourlyWeather(coords, windowStart, yesterday, surface).catch(() => []),
    ])

    // Calibrate on every day that has both a logged reading and observed weather.
    const modelledByDay = new Map<string, number>()
    for (const p of estimateHourlyPower(archive, pv)) {
      const d = p.time.slice(0, 10)
      modelledByDay.set(d, (modelledByDay.get(d) ?? 0) + p.kw)
    }
    const calibration = fitCalibration(
      generation
        .filter((g) => modelledByDay.has(g.recordDate))
        .map((g) => ({ loggedKwh: g.generationKwh, modelledKwh: modelledByDay.get(g.recordDate)! }))
    )
    const k = calibration?.factor ?? 1
    base.calibration = calibration

    const power = estimateHourlyPower(forecast, pv).map((p) => ({ ...p, kw: Math.round(p.kw * k * 1000) / 1000 }))
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

    const displayModelled = new Map(
      [...modelledByDay].filter(([d]) => d >= displayFrom).map(([d, v]) => [d, v * k] as const)
    )
    base.daily = dailyFromLogs(recentGeneration, tariff.rate, displayModelled)
  } catch (err) {
    if (!(err instanceof WeatherUnavailableError)) throw err
    base.weather = { available: false, error: err.message }
    base.daily = dailyFromLogs(recentGeneration, tariff.rate, new Map())
  }

  return base
}

function summariseLive(devices: Awaited<ReturnType<typeof listDevices>>): DashboardOverview['live'] {
  const reporting = devices.filter(
    (d) => (d.kind === 'inverter' || d.kind === 'data_logger') && d.status === 'online' && d.lastPowerW != null
  )
  if (!reporting.length) return null
  return {
    powerKw: Math.round(reporting.reduce((a, d) => a + Math.max(0, d.lastPowerW ?? 0), 0)) / 1000,
    devices: reporting.length,
    lastSeenAt: reporting.map((d) => d.lastSeenAt!).sort().at(-1)!,
    simulated: reporting.some((d) => d.protocol === 'simulator'),
  }
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
