import { describe, it, expect } from 'vitest'
import { MLDatasetExportSchema, MLPredictionIngestSchema } from './schema'

describe('ML Pipeline Interface & Contracts', () => {
  it('validates training dataset schema structure', () => {
    const mockDataset = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_type: 'consumption_forecast' as const,
      exported_at: '2025-01-01T00:00:00.000Z',
      total_records: 1,
      feature_names: ['date', 'consumption_kwh', 'bill_amount_inr'],
      records: [
        {
          date: '2025-01-01',
          month: 'Jan',
          year: 2025,
          consumption_kwh: 342,
          bill_amount_inr: 2740,
          tariff_rate_inr: 7.8,
          peak_demand_kw: 3.5,
          solar_irradiance_ghi: 5.1,
          ambient_temperature_c: 23,
          generation_kwh: 0,
          source: 'user_entered',
        },
      ],
    }

    const parsed = MLDatasetExportSchema.safeParse(mockDataset)
    expect(parsed.success).toBe(true)
  })

  it('validates prediction ingestion schema for external Python model', () => {
    const mockPrediction = {
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      prediction_type: 'consumption_forecast' as const,
      prediction_date: '2025-06-01',
      predicted_value: 395.4,
      actual_value: null,
      unit: 'kWh',
      model_version: 'SolarForecast-XGBoost-v1',
      confidence: 0.92,
      metadata: { mae: 12.4, rmse: 16.8 },
    }

    const parsed = MLPredictionIngestSchema.safeParse(mockPrediction)
    expect(parsed.success).toBe(true)
  })

})
