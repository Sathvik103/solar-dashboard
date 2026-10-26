import 'server-only'

import type { WeatherSample } from '@/lib/solar/pvModel'

/**
 * Open-Meteo client (https://open-meteo.com) — free, keyless weather and
 * satellite-derived solar radiation. All responses are cached via the Next
 * data cache so dashboards do not hammer the upstream API.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const TIMEOUT_MS = 8000

export type Coordinates = { latitude: number; longitude: number; label: string }

export class WeatherUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WeatherUnavailableError'
  }
}

/** Open-Meteo azimuth convention: 0 = south, -90 = east, 90 = west, 180 = north. */
const ORIENTATION_AZIMUTH: Record<string, number> = {
  south: 0,
  'south-east': -45,
  'south-west': 45,
  east: -90,
  west: 90,
  north: 180,
  flat: 0,
  other: 0,
}

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    throw new WeatherUnavailableError(`Weather provider unreachable: ${(err as Error).message}`)
  }
  if (!res.ok) {
    throw new WeatherUnavailableError(`Weather provider returned HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

export async function geocode(city: string, state?: string | null): Promise<Coordinates> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=10&language=en&format=json&countryCode=IN`
  const data = await getJson<{
    results?: { name: string; latitude: number; longitude: number; admin1?: string }[]
  }>(url, 60 * 60 * 24 * 30)
  const results = data.results ?? []
  const match =
    results.find((r) => state && r.admin1?.toLowerCase() === state.toLowerCase()) ?? results[0]
  if (!match) throw new WeatherUnavailableError(`Could not locate "${city}"`)
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    label: [match.name, match.admin1].filter(Boolean).join(', '),
  }
}

type HourlyResponse = {
  hourly: {
    time: string[]
    global_tilted_irradiance?: (number | null)[]
    temperature_2m: (number | null)[]
    cloud_cover?: (number | null)[]
  }
}

export type SurfaceInput = { tiltDeg?: number; orientation?: string | null }

function surfaceParams(surface: SurfaceInput, latitude: number) {
  const tilt = Math.round(surface.tiltDeg ?? Math.min(30, Math.max(5, latitude)))
  const azimuth = ORIENTATION_AZIMUTH[surface.orientation ?? 'south'] ?? 0
  return { tilt, azimuth }
}

/** Hourly plane-of-array irradiance + temperature for [today-pastDays, today+forecastDays). */
export async function getHourlyWeather(
  coords: Coordinates,
  surface: SurfaceInput = {},
  opts: { pastDays?: number; forecastDays?: number } = {}
): Promise<WeatherSample[]> {
  const { tilt, azimuth } = surfaceParams(surface, coords.latitude)
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    hourly: 'global_tilted_irradiance,temperature_2m,cloud_cover',
    tilt: String(tilt),
    azimuth: String(azimuth),
    timezone: 'Asia/Kolkata',
    past_days: String(opts.pastDays ?? 0),
    forecast_days: String(opts.forecastDays ?? 1),
  })
  const data = await getJson<HourlyResponse>(`${FORECAST_URL}?${params}`, 15 * 60)
  const { time, global_tilted_irradiance, temperature_2m } = data.hourly
  return time.map((t, i) => ({
    time: t,
    poaWm2: global_tilted_irradiance?.[i] ?? 0,
    tempC: temperature_2m[i] ?? 25,
  }))
}

/** Hourly archive (ERA5 + satellite) for an inclusive date range, YYYY-MM-DD. */
export async function getArchivedHourlyWeather(
  coords: Coordinates,
  startDate: string,
  endDate: string,
  surface: SurfaceInput = {}
): Promise<WeatherSample[]> {
  const { tilt, azimuth } = surfaceParams(surface, coords.latitude)
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    start_date: startDate,
    end_date: endDate,
    hourly: 'global_tilted_irradiance,temperature_2m',
    tilt: String(tilt),
    azimuth: String(azimuth),
    timezone: 'Asia/Kolkata',
  })
  const data = await getJson<HourlyResponse>(`${ARCHIVE_URL}?${params}`, 60 * 60 * 6)
  return data.hourly.time.map((t, i) => ({
    time: t,
    poaWm2: data.hourly.global_tilted_irradiance?.[i] ?? 0,
    tempC: data.hourly.temperature_2m[i] ?? 25,
  }))
}

export type MonthlyClimate = { month: number; ghiKwhM2Day: number; tempC: number }

/** Multi-year monthly GHI (kWh/m²/day) and mean temperature from the ERA5 archive. */
export async function getMonthlyClimatology(
  coords: Coordinates,
  years = 3
): Promise<MonthlyClimate[]> {
  const endYear = new Date().getUTCFullYear() - 1
  const startYear = endYear - years + 1
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    daily: 'shortwave_radiation_sum,temperature_2m_mean',
    timezone: 'Asia/Kolkata',
  })
  const data = await getJson<{
    daily: {
      time: string[]
      shortwave_radiation_sum: (number | null)[]
      temperature_2m_mean: (number | null)[]
    }
  }>(`${ARCHIVE_URL}?${params}`, 60 * 60 * 24 * 30)

  const ghiSum = Array<number>(12).fill(0)
  const tempSum = Array<number>(12).fill(0)
  const count = Array<number>(12).fill(0)
  data.daily.time.forEach((t, i) => {
    const ghi = data.daily.shortwave_radiation_sum[i]
    const temp = data.daily.temperature_2m_mean[i]
    if (ghi == null || temp == null) return
    const m = Number(t.slice(5, 7)) - 1
    ghiSum[m] += ghi / 3.6 // MJ/m² -> kWh/m²
    tempSum[m] += temp
    count[m] += 1
  })
  return ghiSum.map((sum, m) => ({
    month: m,
    ghiKwhM2Day: count[m] ? round(sum / count[m], 2) : 0,
    tempC: count[m] ? round(tempSum[m] / count[m], 1) : 0,
  }))
}

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
