import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from '@/lib/dal/users'

export type PredictionType = 'consumption_forecast' | 'solar_generation_forecast' | 'electricity_bill_forecast'

export type MLPredictionRecord = {
  id: string
  userId: string
  predictionType: PredictionType
  predictionDate: string
  predictedValue: number
  actualValue: number | null
  unit: string
  modelVersion: string
  confidence: number | null
  metadata: unknown
  createdAt: string
}

/**
 * Predictions stored in public.ml_predictions by the external Python pipeline.
 * Empty when none exist — no synthetic predictions are ever produced.
 */
export async function getMLPredictions(
  userId?: string,
  predictionType: PredictionType = 'consumption_forecast'
): Promise<MLPredictionRecord[]> {
  const supabase = await createSupabaseServerClient()
  const targetUserId = userId || (await requireUser()).id

  const { data, error } = await supabase
    .from('ml_predictions')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('prediction_type', predictionType)
    .order('prediction_date', { ascending: true })

  if (error) throw new Error(`Failed to load ML predictions: ${error.message}`)

  return (data ?? []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    predictionType: d.prediction_type as PredictionType,
    predictionDate: d.prediction_date,
    predictedValue: Number(d.predicted_value),
    actualValue: d.actual_value != null ? Number(d.actual_value) : null,
    unit: d.unit,
    modelVersion: d.model_version,
    confidence: d.confidence != null ? Number(d.confidence) : null,
    metadata: d.metadata,
    createdAt: d.created_at,
  }))
}
