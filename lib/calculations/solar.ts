export type ROIInput = {
  numberOfPanels: number
  costPerPanel: number
  dailySunlightHours: number
  electricityRate: number
  panelWattage: number
}

export type ROIResult = {
  totalInvestment: number
  dailyGeneration: number
  dailySavings: number
  monthlySavings: number
  yearlySavings: number
  breakEvenMonths: number
  breakEvenYears: number
}

export function calculateROI(input: ROIInput): ROIResult {
  const totalInvestment = input.numberOfPanels * input.costPerPanel
  const dailyGeneration = parseFloat(
    ((input.numberOfPanels * input.panelWattage * input.dailySunlightHours) / 1000).toFixed(2)
  )
  const dailySavings = parseFloat((dailyGeneration * input.electricityRate).toFixed(2))
  const monthlySavings = parseFloat((dailySavings * 30).toFixed(2))
  const yearlySavings = parseFloat((dailySavings * 365).toFixed(2))
  const breakEvenMonths = Math.ceil(totalInvestment / monthlySavings)

  return {
    totalInvestment,
    dailyGeneration,
    dailySavings,
    monthlySavings,
    yearlySavings,
    breakEvenMonths,
    breakEvenYears: parseFloat((breakEvenMonths / 12).toFixed(1)),
  }
}

export type BreakevenDataPoint = {
  month: number
  [key: string]: number
}

/**
 * Generates cumulative net-position data for a breakeven chart over 120 months.
 *
 * @param numberOfPanels  - Total number of panels in the system
 * @param dailySunlightHours - Average daily peak sun hours for the location
 * @param electricityRate - Electricity tariff in ₹/kWh
 * @param panels - Array of panel configurations to compare. Passed as a
 *   parameter (not imported from solarData) so this function remains
 *   decoupled from static mock data and can accept any panel set.
 */
export function generateBreakevenCurves(
  numberOfPanels: number,
  dailySunlightHours: number,
  electricityRate: number,
  panels: { name: string; wattage: number; costPerPanel: number }[]
): BreakevenDataPoint[] {
  return Array.from({ length: 121 }, (_, month) => {
    const point: BreakevenDataPoint = { month }
    panels.forEach((panel) => {
      const totalInvestment = numberOfPanels * panel.costPerPanel
      const monthlySavings =
        ((numberOfPanels * panel.wattage * dailySunlightHours) / 1000) *
        electricityRate *
        30
      point[panel.name] = parseFloat(
        (monthlySavings * month - totalInvestment).toFixed(2)
      )
    })
    return point
  })
}
