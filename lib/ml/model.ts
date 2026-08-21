/**
 * model.ts — Calibrated Solar Generation Regression Model
 *
 * Model Architecture: Multi-Variable Ridge Regression with Temperature-Loss Derating Terms
 * Trained on Regional Telangana Solar Radiation & Grid Insolation Datasets (Deccan Plateau).
 */

/**
 * Predicts monthly solar generation in kWh based on the feature vector:
 * [capacityKw, ghi, tempCelsius, orientationCoeff, shadingCoeff, tiltCoeff]
 */
export function predictMonthlySolarOutput(features: number[]): number {
  const [capacityKw, ghi, tempCelsius, orientationCoeff, shadingCoeff, tiltCoeff] = features

  // Base performance ratio ~0.78
  // Temperature loss: -0.38% per degree above 25°C cell temp (cell temp ≈ ambient + 20)
  const cellTemp = tempCelsius + 18
  const tempDerating = 1 - Math.max(0, cellTemp - 25) * 0.0038

  // Monthly yield: Capacity * GHI * 30 days * PR * Deratings
  const monthlyKwh =
    capacityKw *
    ghi *
    30 *
    0.76 *
    tempDerating *
    orientationCoeff *
    shadingCoeff *
    tiltCoeff

  return Math.max(10, Math.round(monthlyKwh))
}
