import { z } from 'zod'
import { getMLPredictions } from '@/lib/ml/predictions'

export const GetMLPredictionsSchema = z.object({
  predictionType: z
    .enum(['consumption_forecast', 'solar_generation_forecast', 'electricity_bill_forecast'])
    .default('consumption_forecast')
    .describe('Type of prediction dataset'),
})

export type GetMLPredictionsInput = z.infer<typeof GetMLPredictionsSchema>

/**
 * Returns stored ML predictions written by the external Python pipeline for the session user.
 * Performs no ML calculation itself.
 */
export async function getMLPredictionsTool(input: GetMLPredictionsInput) {
  try {
    const predictions = await getMLPredictions(undefined, input.predictionType)
    if (predictions.length === 0) {
      return {
        available: false,
        message: 'No ML predictions have been ingested for this user yet. Do not invent forecasts.',
        predictions: [],
      }
    }
    return {
      available: true,
      totalPredictions: predictions.length,
      modelVersion: predictions[0].modelVersion,
      predictions: predictions.map((p) => ({
        date: p.predictionDate,
        predicted: p.predictedValue,
        actual: p.actualValue,
        unit: p.unit,
        confidence: p.confidence,
      })),
    }
  } catch (error) {
    return { available: false, error: (error as Error).message }
  }
}
