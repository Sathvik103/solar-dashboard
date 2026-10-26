/**
 * pvModel.ts — physics-based PV output estimator.
 *
 * Converts measured/forecast plane-of-array irradiance and ambient temperature
 * into AC power using the standard NOCT cell-temperature model and a
 * temperature coefficient. Pure and deterministic: all inputs come from real
 * weather data (see lib/data/weather.ts) and the user's system description.
 */

export type PvSystem = {
  capacityKw: number
  /** Combined soiling/wiring/mismatch/availability losses (0-1 multiplier). */
  systemEfficiency?: number
  inverterEfficiency?: number
  /** Fraction of output retained after shading (1 = no shading). */
  shadingFactor?: number
  /** Power temperature coefficient per °C (mono-Si ≈ -0.0035). */
  tempCoefficient?: number
  noct?: number
  /** AC clipping limit; defaults to capacityKw. */
  inverterCapacityKw?: number
  /** Years since commissioning, for degradation. */
  systemAgeYears?: number
  annualDegradation?: number
}

export type WeatherSample = {
  /** ISO local time, e.g. 2026-10-26T12:00 */
  time: string
  /** Plane-of-array irradiance, W/m² */
  poaWm2: number
  tempC: number
}

export type PowerSample = { time: string; kw: number }

export const SHADING_FACTORS: Record<string, number> = {
  none: 1,
  low: 0.95,
  partial: 0.88,
  medium: 0.85,
  high: 0.72,
  heavy: 0.7,
}

export function shadingFactorFor(level: string | null | undefined): number {
  return (level && SHADING_FACTORS[level]) || 1
}

export function estimatePowerKw(sample: Pick<WeatherSample, 'poaWm2' | 'tempC'>, system: PvSystem): number {
  const g = Math.max(0, sample.poaWm2)
  if (g <= 0 || system.capacityKw <= 0) return 0

  const noct = system.noct ?? 45
  const gamma = system.tempCoefficient ?? -0.0035
  const cellTemp = sample.tempC + ((noct - 20) / 800) * g
  const tempFactor = Math.max(0, 1 + gamma * (cellTemp - 25))

  const age = system.systemAgeYears ?? 0
  const degradation = Math.pow(1 - (system.annualDegradation ?? 0.006), Math.max(0, age))

  const dc =
    system.capacityKw *
    (g / 1000) *
    tempFactor *
    (system.systemEfficiency ?? 0.9) *
    (system.shadingFactor ?? 1) *
    degradation
  const ac = dc * (system.inverterEfficiency ?? 0.97)
  return Math.min(ac, system.inverterCapacityKw ?? system.capacityKw)
}

export function estimateHourlyPower(samples: WeatherSample[], system: PvSystem): PowerSample[] {
  return samples.map((s) => ({ time: s.time, kw: round(estimatePowerKw(s, system), 3) }))
}

/** Energy in kWh from hourly mean power samples (each sample = 1 hour). */
export function sumEnergyKwh(power: PowerSample[]): number {
  return round(power.reduce((acc, p) => acc + p.kw, 0), 2)
}

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
