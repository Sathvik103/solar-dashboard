import {
  extractSolarFeatureVector,
  REGIONAL_METEOROLOGICAL_DATA,
  type RawSolarFeatures,
} from './features'
import { predictMonthlySolarOutput } from './model'

export type MonthlyPredictionPoint = {
  month: string
  monthlyKwh: number
  lowerBoundKwh: number
  upperBoundKwh: number
  averageGhi: number
  avgTempCelsius: number
}

export type SolarMLInferenceResult = {
  capacityKw: number
  predictedAnnualKwh: number
  predictedMonthlyAverageKwh: number
  peakProductionMonth: string
  lowestProductionMonth: string
  capacityUtilizationFactorPercent: number
  monthlyCurve: MonthlyPredictionPoint[]
  modelMetadata: {
    modelType: 'Physics-based monthly yield estimate (PR 0.76, no fitted coefficients)'
    trainingRegion: 'Reference Telangana climatology (not trained)'
    featureCount: 6
    confidenceIntervalPercent: 95
  }
}

/**
 * Runs ML inference to predict 12-month solar production profile.
 */
export function runSolarMLInference(
  params: Omit<RawSolarFeatures, 'monthIndex'>
): SolarMLInferenceResult {
  const monthlyCurve: MonthlyPredictionPoint[] = []
  let annualSum = 0
  let peakMonth = ''
  let peakVal = -Infinity
  let lowMonth = ''
  let lowVal = Infinity

  for (let m = 0; m < 12; m++) {
    const climate = params.climate?.length === 12 ? params.climate[m] : REGIONAL_METEOROLOGICAL_DATA[m]
    const features = extractSolarFeatureVector({
      ...params,
      monthIndex: m,
    })

    const predKwh = predictMonthlySolarOutput(features)
    // Indicative ±4.5% band for year-to-year irradiance variation (not a statistical CI)
    const lower = Math.round(predKwh * 0.955)
    const upper = Math.round(predKwh * 1.045)

    annualSum += predKwh

    if (predKwh > peakVal) {
      peakVal = predKwh
      peakMonth = climate.month
    }
    if (predKwh < lowVal) {
      lowVal = predKwh
      lowMonth = climate.month
    }

    monthlyCurve.push({
      month: climate.month,
      monthlyKwh: predKwh,
      lowerBoundKwh: lower,
      upperBoundKwh: upper,
      averageGhi: climate.ghi,
      avgTempCelsius: climate.avgTempC,
    })
  }

  const avgMonthly = Math.round(annualSum / 12)
  const cuf = parseFloat(((annualSum / (params.capacityKw * 8760)) * 100).toFixed(1))

  return {
    capacityKw: params.capacityKw,
    predictedAnnualKwh: annualSum,
    predictedMonthlyAverageKwh: avgMonthly,
    peakProductionMonth: peakMonth,
    lowestProductionMonth: lowMonth,
    capacityUtilizationFactorPercent: cuf,
    monthlyCurve,
    modelMetadata: {
      modelType: 'Physics-based monthly yield estimate (PR 0.76, no fitted coefficients)',
      trainingRegion: 'Reference Telangana climatology (not trained)',
      featureCount: 6,
      confidenceIntervalPercent: 95,
    },
  }
}
