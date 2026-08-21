/**
 * systemSizing.ts — Solar system sizing recommender & emissions reduction model
 */

export type SizingInput = {
  monthlyUnitsKwh: number
  monthlyBillInr?: number
  roofAreaSqft?: number
  roofType?: string
  roofOrientation?: string
  shadingLevel?: string
  budgetInr?: number
}

export type SizingRecommendation = {
  recommendedCapacityKw: number
  minimumCapacityKw: number
  maximumCapacityByRoofKw: number
  estimatedMonthlyGenerationKwh: number
  estimatedAnnualGenerationKwh: number
  coveragePercentage: number
  requiredRoofAreaSqft: number
  isRoofSufficient: boolean
  estimatedGrossCostInr: number
  subsidyAmountInr: number
  netCostInr: number
  estimatedMonthlySavingsInr: number
  estimatedAnnualSavingsInr: number
  paybackPeriodYears: number
  annualCo2AvoidedKg: number
  treesEquivalentPlanted: number
  comparisonOptions: {
    capacityKw: number
    monthlyGenKwh: number
    grossCostInr: number
    subsidyInr: number
    netCostInr: number
    monthlySavingsInr: number
    paybackYears: number
  }[]
}

/**
 * Calculates optimal solar system size for a household in Telangana.
 */
export function calculateOptimalSystemSize(input: SizingInput): SizingRecommendation {
  const monthlyUnits = input.monthlyUnitsKwh > 0 ? input.monthlyUnitsKwh : 350
  const roofArea = input.roofAreaSqft && input.roofAreaSqft > 0 ? input.roofAreaSqft : 800

  // Shading derating factor
  const shadingFactor =
    input.shadingLevel === 'heavy' ? 0.7 : input.shadingLevel === 'partial' ? 0.85 : 1.0

  // Average monthly generation per 1 kWp in Hyderabad: ~125 kWh/month
  const baseMonthlyGenPerKw = 125 * shadingFactor

  // Sizing to offset ~90% to 100% of consumption
  const idealCapacityRaw = monthlyUnits / baseMonthlyGenPerKw
  // Snap to standard capacities (1, 2, 3, 4, 5, 6, 7, 8, 10 kW)
  let recommendedKw = Math.round(idealCapacityRaw)
  if (recommendedKw < 1) recommendedKw = 1
  if (recommendedKw > 10) recommendedKw = 10

  // 1 kW requires ~90 sq.ft of shadow-free area
  const maxCapacityByRoof = Math.floor(roofArea / 90)
  const isRoofSufficient = maxCapacityByRoof >= recommendedKw

  if (!isRoofSufficient && maxCapacityByRoof >= 1) {
    recommendedKw = Math.max(1, maxCapacityByRoof)
  }

  const standardSizes = [2, 3, 5, 7, 10]
  const costPerKwBenchmark = 65000 // approx ₹65,000 / kW in Hyderabad

  const estimatedMonthlyGen = Math.round(recommendedKw * baseMonthlyGenPerKw)
  const estimatedAnnualGen = Math.round(estimatedMonthlyGen * 12)
  const coveragePercent = Math.min(100, Math.round((estimatedMonthlyGen / monthlyUnits) * 100))

  // Subsidies under PM Surya Ghar
  const getSubsidy = (kw: number) => {
    if (kw <= 1) return 30000
    if (kw === 2) return 60000
    return 78000
  }

  const grossCost = recommendedKw * costPerKwBenchmark
  const subsidy = getSubsidy(recommendedKw)
  const netCost = Math.max(0, grossCost - subsidy)

  // Average electricity rate ~₹8.00 per kWh
  const monthlySavings = Math.round(Math.min(estimatedMonthlyGen, monthlyUnits) * 8.0)
  const annualSavings = monthlySavings * 12
  const payback =
    annualSavings > 0 ? parseFloat((netCost / annualSavings).toFixed(1)) : 99

  // Emissions: 0.82 kg CO2 per kWh, 1 tree absorbs ~20 kg CO2 / year
  const annualCo2AvoidedKg = Math.round(estimatedAnnualGen * 0.82)
  const treesEquivalent = Math.round(annualCo2AvoidedKg / 20)

  const comparisonOptions = standardSizes.map((cap) => {
    const gen = Math.round(cap * baseMonthlyGenPerKw)
    const gross = cap * costPerKwBenchmark
    const sub = getSubsidy(cap)
    const net = gross - sub
    const sav = Math.round(Math.min(gen, monthlyUnits) * 8.0)
    const pb = sav > 0 ? parseFloat((net / (sav * 12)).toFixed(1)) : 99
    return {
      capacityKw: cap,
      monthlyGenKwh: gen,
      grossCostInr: gross,
      subsidyInr: sub,
      netCostInr: net,
      monthlySavingsInr: sav,
      paybackYears: pb,
    }
  })

  return {
    recommendedCapacityKw: recommendedKw,
    minimumCapacityKw: 1,
    maximumCapacityByRoofKw: maxCapacityByRoof,
    estimatedMonthlyGenerationKwh: estimatedMonthlyGen,
    estimatedAnnualGenerationKwh: estimatedAnnualGen,
    coveragePercentage: coveragePercent,
    requiredRoofAreaSqft: recommendedKw * 90,
    isRoofSufficient,
    estimatedGrossCostInr: grossCost,
    subsidyAmountInr: subsidy,
    netCostInr: netCost,
    estimatedMonthlySavingsInr: monthlySavings,
    estimatedAnnualSavingsInr: annualSavings,
    paybackPeriodYears: payback,
    annualCo2AvoidedKg,
    treesEquivalentPlanted: treesEquivalent,
    comparisonOptions,
  }
}
