/**
 * metrics.ts — evaluation metrics computed from real prediction/actual pairs
 * stored in public.ml_predictions. Nothing here is hard-coded.
 */

export type MLModelStatusInfo = {
  status: 'awaiting_model' | 'active'
  modelVersion?: string
  lastPredictionAt?: string
  totalTrainingRecords: number
  evaluatedPairs: number
  metrics?: { mae: number; rmse: number; r2Score: number | null; mapePercent: number | null }
}

export type PredictionPair = { predicted: number; actual: number | null; modelVersion?: string; createdAt?: string }

export function computeRegressionMetrics(pairs: { predicted: number; actual: number }[]) {
  const n = pairs.length
  if (n === 0) return undefined
  let abs = 0
  let sq = 0
  let pct = 0
  let pctN = 0
  const mean = pairs.reduce((a, p) => a + p.actual, 0) / n
  let ssTot = 0
  for (const { predicted, actual } of pairs) {
    const e = predicted - actual
    abs += Math.abs(e)
    sq += e * e
    ssTot += (actual - mean) ** 2
    if (actual !== 0) {
      pct += Math.abs(e / actual) * 100
      pctN++
    }
  }
  return {
    mae: round(abs / n),
    rmse: round(Math.sqrt(sq / n)),
    r2Score: n >= 2 && ssTot > 0 ? round(1 - sq / ssTot) : null,
    mapePercent: pctN ? round(pct / pctN) : null,
  }
}

export function getMLModelStatus(predictions: PredictionPair[], recordCount: number): MLModelStatusInfo {
  if (predictions.length === 0) {
    return { status: 'awaiting_model', totalTrainingRecords: recordCount, evaluatedPairs: 0 }
  }
  const evaluated = predictions.filter((p): p is PredictionPair & { actual: number } => p.actual != null)
  const latest = [...predictions].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  return {
    status: 'active',
    modelVersion: latest.modelVersion,
    lastPredictionAt: latest.createdAt,
    totalTrainingRecords: recordCount,
    evaluatedPairs: evaluated.length,
    metrics: computeRegressionMetrics(evaluated.map((p) => ({ predicted: p.predicted, actual: p.actual }))),
  }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}
