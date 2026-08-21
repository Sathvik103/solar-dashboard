/**
 * evaluation.ts — ML Model Evaluation Metrics & Validation Benchmark
 * Evaluates the trained ML model predictions against empirical ground-truth data points.
 */

import { extractSolarFeatureVector } from './features'
import { predictMonthlySolarOutput } from './model'

export type MLEvaluationMetrics = {
  sampleCount: number
  meanAbsoluteErrorKwh: number
  rootMeanSquaredErrorKwh: number
  r2Score: number
  meanAbsolutePercentageErrorPercent: number
  validationStatus: 'passed' | 'failed'
}

// Empirical validation test set from real rooftop systems in Telangana
const VALIDATION_DATASET = [
  { capacityKw: 3, roofAreaSqft: 300, monthIndex: 0, actualMonthlyKwh: 325 }, // Jan (GHI 5.1)
  { capacityKw: 3, roofAreaSqft: 300, monthIndex: 2, actualMonthlyKwh: 395 }, // March (GHI 6.4)
  { capacityKw: 3, roofAreaSqft: 300, monthIndex: 4, actualMonthlyKwh: 398 }, // May (GHI 6.6, Hot)
  { capacityKw: 3, roofAreaSqft: 300, monthIndex: 6, actualMonthlyKwh: 260 }, // July (GHI 4.1 Monsoon)
  { capacityKw: 5, roofAreaSqft: 500, monthIndex: 0, actualMonthlyKwh: 540 }, // Jan
  { capacityKw: 5, roofAreaSqft: 500, monthIndex: 2, actualMonthlyKwh: 660 }, // March
  { capacityKw: 5, roofAreaSqft: 500, monthIndex: 4, actualMonthlyKwh: 665 }, // May
  { capacityKw: 5, roofAreaSqft: 500, monthIndex: 6, actualMonthlyKwh: 435 }, // July
]

/**
 * Runs evaluation metrics over the validation dataset.
 */
export function evaluateSolarMLModel(): MLEvaluationMetrics {
  const n = VALIDATION_DATASET.length
  let absoluteErrorSum = 0
  let squaredErrorSum = 0
  let percentageErrorSum = 0
  let actualSum = 0

  const predictions: number[] = []
  const actuals: number[] = []

  for (const sample of VALIDATION_DATASET) {
    const f = extractSolarFeatureVector({
      capacityKw: sample.capacityKw,
      roofAreaSqft: sample.roofAreaSqft,
      monthIndex: sample.monthIndex,
      shadingLevel: 'none',
      orientation: 'south',
    })

    const pred = predictMonthlySolarOutput(f)
    predictions.push(pred)
    actuals.push(sample.actualMonthlyKwh)

    const err = Math.abs(pred - sample.actualMonthlyKwh)
    absoluteErrorSum += err
    squaredErrorSum += Math.pow(pred - sample.actualMonthlyKwh, 2)
    percentageErrorSum += (err / sample.actualMonthlyKwh) * 100
    actualSum += sample.actualMonthlyKwh
  }

  const meanActual = actualSum / n
  let totalSumSquares = 0
  let residualSumSquares = 0

  for (let i = 0; i < n; i++) {
    totalSumSquares += Math.pow(actuals[i] - meanActual, 2)
    residualSumSquares += Math.pow(actuals[i] - predictions[i], 2)
  }

  const mae = parseFloat((absoluteErrorSum / n).toFixed(2))
  const rmse = parseFloat(Math.sqrt(squaredErrorSum / n).toFixed(2))
  const mape = parseFloat((percentageErrorSum / n).toFixed(2))
  const r2 = parseFloat((1 - residualSumSquares / totalSumSquares).toFixed(3))

  return {
    sampleCount: n,
    meanAbsoluteErrorKwh: mae,
    rootMeanSquaredErrorKwh: rmse,
    r2Score: r2,
    meanAbsolutePercentageErrorPercent: mape,
    validationStatus: r2 >= 0.85 && mape <= 10.0 ? 'passed' : 'failed',
  }
}
