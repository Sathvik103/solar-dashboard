export type ROIInput = {
  numberOfPanels: number
  costPerPanel: number
  dailySunlightHours: number
  electricityRate: number // ₹ per kWh
  panelWattage: number // watts per panel
}

export type ROIResult = {
  totalInvestment: number
  dailyGeneration: number // kWh
  dailySavings: number // ₹
  monthlySavings: number // ₹
  yearlySavings: number // ₹
  breakEvenMonths: number
  breakEvenYears: number
}

export function calculateROI(input: ROIInput): ROIResult {
  const totalInvestment = input.numberOfPanels * input.costPerPanel
  const dailyGeneration = (input.numberOfPanels * input.panelWattage * input.dailySunlightHours) / 1000
  const dailySavings = dailyGeneration * input.electricityRate
  const monthlySavings = dailySavings * 30
  const yearlySavings = dailySavings * 365
  const breakEvenMonths = Math.ceil(totalInvestment / monthlySavings)
  const breakEvenYears = parseFloat((breakEvenMonths / 12).toFixed(1))

  return {
    totalInvestment,
    dailyGeneration: parseFloat(dailyGeneration.toFixed(2)),
    dailySavings: parseFloat(dailySavings.toFixed(2)),
    monthlySavings: parseFloat(monthlySavings.toFixed(2)),
    yearlySavings: parseFloat(yearlySavings.toFixed(2)),
    breakEvenMonths,
    breakEvenYears,
  }
}