/**
 * features.ts — Machine Learning feature extraction & normalization
 * Extracts environmental, spatial, and meteorological features for solar inference.
 */

export type RawSolarFeatures = {
  capacityKw: number
  roofAreaSqft: number
  tiltAngleDegrees?: number
  orientation?: 'south' | 'south-east' | 'south-west' | 'east' | 'west' | 'north'
  shadingLevel?: 'none' | 'partial' | 'heavy'
  monthIndex: number // 0 to 11
  averageDailyTempCelsius?: number
  /** Measured monthly climate (12 entries, Jan-Dec). Falls back to the reference table when omitted. */
  climate?: MonthlyClimateInput[]
}

export type MonthlyClimateInput = { month: string; ghi: number; avgTempC: number }

export type NormalizedFeatureVector = number[]

// Regional Hyderabad climate benchmarks (Monthly average GHI in kWh/m²/day and ambient temp in °C)
export const REGIONAL_METEOROLOGICAL_DATA = [
  { month: 'Jan', ghi: 5.1, avgTempC: 23 },
  { month: 'Feb', ghi: 5.8, avgTempC: 26 },
  { month: 'Mar', ghi: 6.4, avgTempC: 30 },
  { month: 'Apr', ghi: 6.7, avgTempC: 33 },
  { month: 'May', ghi: 6.6, avgTempC: 35 },
  { month: 'Jun', ghi: 4.9, avgTempC: 30 },
  { month: 'Jul', ghi: 4.1, avgTempC: 27 },
  { month: 'Aug', ghi: 4.0, avgTempC: 26 },
  { month: 'Sep', ghi: 4.7, avgTempC: 27 },
  { month: 'Oct', ghi: 5.2, avgTempC: 26 },
  { month: 'Nov', ghi: 4.9, avgTempC: 24 },
  { month: 'Dec', ghi: 4.8, avgTempC: 22 },
]

/**
 * Extracts and encodes a normalized feature vector for ML inference.
 */
export function extractSolarFeatureVector(raw: RawSolarFeatures): NormalizedFeatureVector {
  const monthIdx = Math.max(0, Math.min(11, raw.monthIndex))
  const climate = raw.climate?.length === 12 ? raw.climate[monthIdx] : REGIONAL_METEOROLOGICAL_DATA[monthIdx]

  // Feature 0: Capacity (kW)
  const f_capacity = raw.capacityKw

  // Feature 1: GHI (kWh/m²/day)
  const f_ghi = climate.ghi

  // Feature 2: Ambient Temperature (°C)
  const temp = raw.averageDailyTempCelsius || climate.avgTempC
  const f_temp = temp

  // Feature 3: Orientation coefficient (South = 1.0, West/East = 0.88, North = 0.65)
  const orientationMap: Record<string, number> = {
    south: 1.0,
    'south-east': 0.95,
    'south-west': 0.95,
    east: 0.88,
    west: 0.88,
    north: 0.65,
  }
  const f_orientation = orientationMap[raw.orientation || 'south'] ?? 1.0

  // Feature 4: Shading Derating (None = 1.0, Partial = 0.82, Heavy = 0.65)
  const shadingMap: Record<string, number> = {
    none: 1.0,
    partial: 0.82,
    heavy: 0.65,
  }
  const f_shading = shadingMap[raw.shadingLevel || 'none'] ?? 1.0

  // Feature 5: Optimal Tilt factor
  const tilt = raw.tiltAngleDegrees ?? 15
  const f_tilt = Math.cos(((tilt - 15) * Math.PI) / 180)

  return [f_capacity, f_ghi, f_temp, f_orientation, f_shading, f_tilt]
}
