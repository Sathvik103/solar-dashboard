/**
 * calibration.ts — fits the physics model to a user's own meter readings.
 *
 * The weather-driven PV model has generic losses (soiling, wiring, inverter, shading). Real systems
 * differ, so once a user has logged enough days we fit a single performance factor k that minimises
 * squared error between logged and modelled daily energy (least squares through the origin):
 *
 *     k = Σ(logged · modelled) / Σ(modelled²)
 *
 * k is clamped to a physically plausible range so one bad import cannot distort every estimate.
 */

export const MIN_CALIBRATION_DAYS = 7
const K_MIN = 0.5
const K_MAX = 1.3

export type DayPair = { loggedKwh: number; modelledKwh: number }

export type Calibration = {
  factor: number
  days: number
  /** Mean absolute percentage error of the raw model vs logged days. */
  mapeBeforePercent: number
  /** Same, after applying the factor. */
  mapeAfterPercent: number
}

function mape(pairs: DayPair[], k: number): number {
  const valid = pairs.filter((p) => p.loggedKwh > 0)
  if (valid.length === 0) return 0
  const sum = valid.reduce((a, p) => a + Math.abs(p.modelledKwh * k - p.loggedKwh) / p.loggedKwh, 0)
  return Math.round((sum / valid.length) * 1000) / 10
}

export function fitCalibration(pairs: DayPair[]): Calibration | null {
  // Ignore days with no modelled sun or obviously partial logs (e.g. outage, inverter offline).
  const usable = pairs.filter((p) => p.modelledKwh > 0.5 && p.loggedKwh > 0.05 * p.modelledKwh)
  if (usable.length < MIN_CALIBRATION_DAYS) return null

  const num = usable.reduce((a, p) => a + p.loggedKwh * p.modelledKwh, 0)
  const den = usable.reduce((a, p) => a + p.modelledKwh * p.modelledKwh, 0)
  if (den === 0) return null

  const factor = Math.min(K_MAX, Math.max(K_MIN, num / den))
  return {
    factor: Math.round(factor * 1000) / 1000,
    days: usable.length,
    mapeBeforePercent: mape(usable, 1),
    mapeAfterPercent: mape(usable, factor),
  }
}
