import { z } from 'zod'

/**
 * Zod schema defining the ML training dataset exported to the future Python ML model.
 */
export const MLTrainingRecordSchema = z.object({
  date: z.string().describe('ISO date (YYYY-MM-DD)'),
  month: z.string().describe('Month name (e.g. Jan)'),
  year: z.number().int().describe('Year (e.g. 2025)'),
  consumption_kwh: z.number().describe('Monthly electricity consumption in kWh'),
  bill_amount_inr: z.number().describe('Monthly electricity bill in INR'),
  tariff_rate_inr: z.number().describe('Effective tariff per unit in INR'),
  peak_demand_kw: z.number().nullable().describe('Recorded peak demand in kW'),
  solar_irradiance_ghi: z.number().describe('Regional Global Horizontal Irradiance in kWh/m²/day'),
  ambient_temperature_c: z.number().describe('Average ambient temperature in °C'),
  generation_kwh: z.number().default(0).describe('Solar generation in kWh (if system installed)'),
  source: z.string().describe('Data provenance source'),
})

export type MLTrainingRecord = z.infer<typeof MLTrainingRecordSchema>

export const MLDatasetExportSchema = z.object({
  user_id: z.string(),
  dataset_type: z.enum(['consumption_forecast', 'solar_generation_forecast', 'energy_analysis']),
  exported_at: z.string(),
  total_records: z.number().int(),
  feature_names: z.array(z.string()),
  records: z.array(MLTrainingRecordSchema),
})

export type MLDatasetExport = z.infer<typeof MLDatasetExportSchema>

/**
 * Zod schema defining the output format expected from the external Python ML model
 * when it writes predictions into the ml_predictions table.
 */
export const MLPredictionIngestSchema = z.object({
  user_id: z.string().uuid(),
  prediction_type: z.enum(['consumption_forecast', 'solar_generation_forecast', 'electricity_bill_forecast']),
  prediction_date: z.string().describe('Target forecast date (YYYY-MM-DD)'),
  predicted_value: z.number().describe('Model output forecast value'),
  actual_value: z.number().nullable().optional().describe('Actual observed value once available'),
  unit: z.string().default('kWh'),
  model_version: z.string().default('python_forecast_v1'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence interval / probability score (0.0 to 1.0)'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary hyperparameters, confidence bounds, or feature importances'),
})

export type MLPredictionIngest = z.infer<typeof MLPredictionIngestSchema>
