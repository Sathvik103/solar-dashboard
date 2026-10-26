# SolarIntel — Python ML Integration Contract

## 1. System Integration Architecture

```
┌────────────────────────────────────────────────────────┐
│                   SolarIntel Platform                  │
│       (Next.js 16 + Supabase PostgreSQL Storage)       │
└───────────────────────────┬────────────────────────────┘
                            │
              1. GET /api/ml/dataset
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             External Python ML Subsystem               │
│   (Jupyter / Scikit-learn / XGBoost / PyTorch Engine)  │
│                                                        │
│   - Ingests Historical JSON Tabular Records            │
│   - Trains Solar Generation & Consumption Regressors   │
│   - Computes Performance Metrics (MAE, RMSE, R²)       │
└───────────────────────────┬────────────────────────────┘
                            │
       2. Writes Inferences to public.ml_predictions
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            SolarIntel Analytics Visualization          │
│   (Predicted vs Actual Charts, Model Status Badges)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Training Dataset Export Contract (`GET /api/ml/dataset`)

### Endpoint Details:
- **HTTP Method:** `GET`
- **Path:** `/api/ml/dataset?type=consumption_forecast`
- **Authentication:** Supabase Session Cookie (Authenticated User)

### JSON Response Schema:
```json
{
  "user_id": "8f3e2b1a-9c4d-4e5f-b6a7-8c9d0e1f2a3b",
  "dataset_type": "consumption_forecast",
  "exported_at": "2025-01-15T10:30:00.000Z",
  "total_records": 24,
  "feature_names": [
    "date",
    "month",
    "year",
    "consumption_kwh",
    "bill_amount_inr",
    "tariff_rate_inr",
    "peak_demand_kw",
    "solar_irradiance_ghi",
    "ambient_temperature_c",
    "generation_kwh",
    "source"
  ],
  "records": [
    {
      "date": "2024-01-01",
      "month": "Jan",
      "year": 2024,
      "consumption_kwh": 310,
      "bill_amount_inr": 2350,
      "tariff_rate_inr": 7.6,
      "peak_demand_kw": 3.2,
      "solar_irradiance_ghi": 5.1,
      "ambient_temperature_c": 23,
      "generation_kwh": 0,
      "source": "user_entered"
    }
  ]
}
```

---

## 3. Prediction Ingestion Contract (`public.ml_predictions`)

The Python ML pipeline writes predictions into `public.ml_predictions` using either direct Supabase client (`supabase-py`) or database SQL insert.

### Table Schema:
| Column | Type | Description |
| :--- | :--- | :--- |
| `user_id` | UUID | Authenticated user ID |
| `prediction_type` | TEXT | `'consumption_forecast'` \| `'solar_generation_forecast'` \| `'electricity_bill_forecast'` |
| `prediction_date` | DATE | Future date for forecast (e.g. `'2025-06-01'`) |
| `predicted_value` | NUMERIC | Model forecast output |
| `actual_value` | NUMERIC | Actual observed value (null for future months) |
| `unit` | TEXT | Units of measurement (e.g. `'kWh'`, `'INR'`) |
| `model_version` | TEXT | Identifier (e.g. `'SolarForecast-XGBoost-v1'`) |
| `confidence` | NUMERIC | Confidence score between `0.0` and `1.0` |
| `metadata` | JSONB | Hyperparameters, upper/lower prediction bounds |

---

## 4. UI Rendering Behavior
1. **Awaiting Model (Default):** If `ml_predictions` is empty, SolarIntel displays a status banner (no placeholder forecasts or metrics are shown):
   > *"Analytics predictions will appear here once the SolarIntel Python model is connected."*
2. **Active Predictions:** When records are present, SolarIntel renders:
   - **Predicted vs Actual** comparative line charts and variance tables.
   - **Model Telemetry Card:** Active model version, last trained date, record count, and metrics.
