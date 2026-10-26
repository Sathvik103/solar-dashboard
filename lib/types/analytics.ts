export type ConsumptionRecord = {
  id: string
  userId: string
  recordDate: string
  month: string
  year: number
  consumptionKwh: number
  peakDemandKw: number | null
  billAmount: number
  unitsImported: number | null
  unitsExported: number | null
  tariffRate: number | null
  source: 'user_entered' | 'bill_import' | 'estimated'
  createdAt: string
}

export type RegionalStatRecord = {
  id: string
  state: string
  district: string
  city: string
  pincode: string | null
  recordDate: string
  averageSolarIrradiance: number
  averageGenerationPerKw: number
  averageMonthlyConsumption: number
  averageElectricityTariff: number
  averageRoofArea: number
  adoptionRate: number
  installedCapacityMw: number
  averageSystemSizeKw: number
  averagePaybackYears: number
  averageMonthlySavings: number
  co2ReductionTonnes: number
  source: string
}

export type SavedScenario = {
  id: string
  userId: string
  name: string
  monthlyConsumptionKwh: number
  monthlyBillInr: number
  roofAreaSqft: number
  tariffInr: number
  capacityKw: number
  subsidyInr: number
  shadingLevel: string
  calculatedSavingsInr: number
  calculatedPaybackYears: number
  createdAt: string
}

export type RecommendationRecord = {
  id: string
  userId: string
  query: string
  recommendedCapacityKw: number
  alternativeCapacityKw: number | null
  estimatedGeneration: number
  estimatedSavings: number
  netCost: number
  paybackYears: number
  confidence: number | null
  reasoning: string
  evidence: unknown
  createdAt: string
}

export type GenerationRecord = {
  id: string
  userId: string
  recordDate: string
  generationKwh: number
  exportedKwh: number
  selfConsumedKwh: number
  gridImportKwh: number
  peakGenerationKw: number | null
  source: 'inverter_telemetry' | 'manual_log' | 'estimated'
}

export type SolarSystemRecord = {
  id: string
  capacityKw: number
  panelCount: number | null
  panelWattage: number | null
  inverterCapacityKw: number | null
  installationDate: string | null
  status: string
}

export type EnergyStatistics = ReturnType<typeof computeEnergyStatistics>

/** Aggregates consumption records. Returns nulls (never invented numbers) when there is no data. */
export function computeEnergyStatistics(records: ConsumptionRecord[]) {
  if (records.length === 0) {
    return {
      averageMonthlyConsumption: null,
      highestConsumption: null,
      highestMonth: null,
      lowestConsumption: null,
      lowestMonth: null,
      averageMonthlyBill: null,
      peakDemandAverageKw: null,
      yoyConsumptionChangePercent: null,
      totalRecords: 0,
    }
  }

  let sumKwh = 0
  let sumBill = 0
  let sumPeak = 0
  let maxKwh = -Infinity
  let maxMonth = ''
  let minKwh = Infinity
  let minMonth = ''

  for (const r of records) {
    sumKwh += r.consumptionKwh
    sumBill += r.billAmount
    if (r.peakDemandKw) sumPeak += r.peakDemandKw

    if (r.consumptionKwh > maxKwh) {
      maxKwh = r.consumptionKwh
      maxMonth = `${r.month} ${r.year}`
    }
    if (r.consumptionKwh < minKwh) {
      minKwh = r.consumptionKwh
      minMonth = `${r.month} ${r.year}`
    }
  }

  const avgKwh = Math.round(sumKwh / records.length)
  const avgBill = Math.round(sumBill / records.length)
  const peakCount = records.filter((r) => r.peakDemandKw).length
  const avgPeak = peakCount ? parseFloat((sumPeak / peakCount).toFixed(1)) : null

  let yoyChange: number | null = null
  if (records.length >= 24) {
    const y1 = records.slice(0, 12).reduce((acc, c) => acc + c.consumptionKwh, 0)
    const y2 = records.slice(12, 24).reduce((acc, c) => acc + c.consumptionKwh, 0)
    if (y1 > 0) yoyChange = parseFloat((((y2 - y1) / y1) * 100).toFixed(1))
  }

  return {
    averageMonthlyConsumption: avgKwh,
    highestConsumption: maxKwh,
    highestMonth: maxMonth,
    lowestConsumption: minKwh,
    lowestMonth: minMonth,
    averageMonthlyBill: avgBill,
    peakDemandAverageKw: avgPeak,
    yoyConsumptionChangePercent: yoyChange,
    totalRecords: records.length,
  }
}
