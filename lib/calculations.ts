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
  const dailyGeneration =
    (input.numberOfPanels * input.panelWattage * input.dailySunlightHours) / 1000
  const dailySavings = dailyGeneration * input.electricityRate
  const monthlySavings = dailySavings * 30
  const yearlySavings = dailySavings * 365
  const breakEvenMonths = Math.ceil(totalInvestment / monthlySavings)

  return {
    totalInvestment,
    dailyGeneration: parseFloat(dailyGeneration.toFixed(2)),
    dailySavings: parseFloat(dailySavings.toFixed(2)),
    monthlySavings: parseFloat(monthlySavings.toFixed(2)),
    yearlySavings: parseFloat(yearlySavings.toFixed(2)),
    breakEvenMonths,
    breakEvenYears: parseFloat((breakEvenMonths / 12).toFixed(1)),
  }
}

export type BreakevenDataPoint = {
  month: number
  [key: string]: number
}

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