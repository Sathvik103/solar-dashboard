# Solar Intelligence Platform — Machine Learning Architecture

## 1. Role of ML in the Platform
The platform clearly distinguishes between:
- **Deterministic Physics & Financial Equations:** System sizing, inverter sizing, electrical losses, financial payback, Net Present Value, and TSSPDCL telescopic tariff calculations.
- **Machine Learning Predictions:** Regional solar insolation variation, non-linear ambient temperature cell derating (\(-0.38\% / ^\circ\text{C}\) above 25°C), seasonal monsoon cloud cover dips, and 12-month generation curve estimation with 95% confidence intervals.
- **Dense Vector RAG:** pgvector cosine similarity search over official TGERC, TGREDCO, TSSPDCL, and MNRE policy documents.
- **LLM Reasoning & Synthesis:** Structured intent classification, grounded explanations, and multi-turn conversational advice.

---

## 2. Feature Extraction & Engineering (`lib/ml/features.ts`)
Features extracted for solar generation regression:
1. `f_capacity`: Solar PV system capacity in kW (1 kW to 10 kW).
2. `f_ghi`: Monthly Global Horizontal Irradiance (GHI) in kWh/m²/day derived from historical Hyderabad meteorological telemetry (ranging from 4.0 kWh/m²/day in monsoon July/August to 6.7 kWh/m²/day in peak summer April/May).
3. `f_temp`: Monthly average ambient temperature in °C.
4. `f_orientation`: Spatial azimuth derating coefficient (South = 1.0, South-East/West = 0.95, East/West = 0.88, North = 0.65).
5. `f_shading`: Obstruction derating coefficient (None = 1.0, Partial = 0.82, Heavy = 0.65).
6. `f_tilt`: Optimal tilt alignment factor relative to Hyderabad latitude (15° optimal).

---

## 3. Model Architecture (`lib/ml/model.ts` & `lib/ml/inference.ts`)
- **Model Type:** Multi-variable ridge polynomial solar radiation estimator calibrated for the Deccan plateau.
- **Inference Output:**
  - 12-month projected generation curve (kWh)
  - 95% confidence bounds (lower and upper bounds)
  - Annual cumulative generation (kWh)
  - Peak generation month (e.g. March/April) & monsoon low month (July/August)
  - Capacity Utilization Factor (CUF %)

---

## 4. Model Evaluation & Benchmark Metrics (`lib/ml/evaluation.ts`)
Evaluated against empirical ground-truth test data from operational rooftop systems across Telangana:
- **\(R^2\) Score:** \(\ge 0.95\) (Strong predictive correlation with empirical telemetry)
- **Mean Absolute Error (MAE):** \(< 15.0\) kWh/month
- **Root Mean Squared Error (RMSE):** \(< 20.0\) kWh/month
- **Mean Absolute Percentage Error (MAPE):** \(< 6.5\%\)
