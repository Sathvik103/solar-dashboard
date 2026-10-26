/**
 * financial.ts — Financial projection and economic calculation engine
 * Deterministic formulas for solar payback, NPV, IRR, and 25-year lifetime projections.
 */

export type NPVInput = {
  initialInvestment: number
  annualSavings: number
  discountRate: number
  years: number
  degradationRate?: number
  tariffEscalationRate?: number
}

export type NPVResult = {
  npv: number
  isViable: boolean
  discountRate: number
  lifetimeSavingsGross: number
}

export type SavingsProjection = {
  initialInvestment: number
  annualSavings: number
  degradationRate: number
  tariffEscalationRate: number
  years: number
}

export type YearByYearCashflow = {
  year: number
  generationKwh: number
  savingsInr: number
  cumulativeSavingsInr: number
  netCashflowInr: number
}

export type SubsidyAdjustment = {
  grossCost: number
  subsidyAmount: number
  netCost: number
}

/**
 * Calculates Net Present Value (NPV) over project lifetime.
 * NPV = Sum( Savings_t / (1 + r)^t ) - InitialInvestment
 */
export function calculateNPV(input: NPVInput): NPVResult {
  const {
    initialInvestment,
    annualSavings,
    discountRate,
    years,
    degradationRate = 0.005,
    tariffEscalationRate = 0.03,
  } = input

  let discountedSavingsSum = 0
  let lifetimeSavingsGross = 0

  for (let year = 1; year <= years; year++) {
    const generationFactor = Math.pow(1 - degradationRate, year - 1)
    const tariffFactor = Math.pow(1 + tariffEscalationRate, year - 1)
    const yearSavings = annualSavings * generationFactor * tariffFactor

    lifetimeSavingsGross += yearSavings
    discountedSavingsSum += yearSavings / Math.pow(1 + discountRate, year)
  }

  const npv = parseFloat((discountedSavingsSum - initialInvestment).toFixed(2))

  return {
    npv,
    isViable: npv > 0,
    discountRate,
    lifetimeSavingsGross: parseFloat(lifetimeSavingsGross.toFixed(2)),
  }
}

/**
 * Calculates 25-year cumulative savings projection with year-by-year breakdown.
 */
export function calculate25YearSavings(input: SavingsProjection): {
  totalSavings: number
  netProfit: number
  cashflows: YearByYearCashflow[]
} {
  const {
    initialInvestment,
    annualSavings,
    degradationRate = 0.005,
    tariffEscalationRate = 0.03,
    years = 25,
  } = input

  const cashflows: YearByYearCashflow[] = []
  let cumulativeSavings = 0
  const baseAnnualGeneration = 1400 // approx kWh per kW

  for (let year = 1; year <= years; year++) {
    const genFactor = Math.pow(1 - degradationRate, year - 1)
    const tariffFactor = Math.pow(1 + tariffEscalationRate, year - 1)
    const yearSavings = annualSavings * genFactor * tariffFactor
    cumulativeSavings += yearSavings

    cashflows.push({
      year,
      generationKwh: Math.round(baseAnnualGeneration * genFactor),
      savingsInr: Math.round(yearSavings),
      cumulativeSavingsInr: Math.round(cumulativeSavings),
      netCashflowInr: Math.round(cumulativeSavings - initialInvestment),
    })
  }

  return {
    totalSavings: Math.round(cumulativeSavings),
    netProfit: Math.round(cumulativeSavings - initialInvestment),
    cashflows,
  }
}

/**
 * Calculates exact payback period in years taking into account tariff escalation.
 */
export function calculatePaybackPeriod(
  netInvestment: number,
  firstYearSavings: number,
  tariffEscalationRate = 0.03,
  degradationRate = 0.005
): number {
  if (firstYearSavings <= 0) return 99
  let cumulative = 0
  for (let year = 1; year <= 30; year++) {
    const genFactor = Math.pow(1 - degradationRate, year - 1)
    const tariffFactor = Math.pow(1 + tariffEscalationRate, year - 1)
    const yearSavings = firstYearSavings * genFactor * tariffFactor
    cumulative += yearSavings
    if (cumulative >= netInvestment) {
      const prevCumulative = cumulative - yearSavings
      const fraction = (netInvestment - prevCumulative) / yearSavings
      return parseFloat(((year - 1) + fraction).toFixed(1))
    }
  }
  return parseFloat((netInvestment / firstYearSavings).toFixed(1))
}

/**
 * PM Surya Ghar: Muft Bijli Yojana central financial assistance for residential rooftop solar
 * (MNRE guidelines, as amended July 2025; general-category states incl. Telangana):
 * - ₹30,000 per kW for the first 2 kW
 * - ₹18,000 per kW for the next 1 kW
 * - capped at ₹78,000 (no additional CFA beyond 3 kW)
 * Pro-rated for fractional capacities. Verify on pmsuryaghar.gov.in before quoting.
 */
export const PM_SURYA_GHAR = {
  firstTierPerKwInr: 30000,
  firstTierMaxKw: 2,
  secondTierPerKwInr: 18000,
  secondTierMaxKw: 3,
  capInr: 78000,
  source: 'MNRE PM Surya Ghar guidelines (amended July 2025)',
} as const

export function calculatePMSuryaGharSubsidy(capacityKw: number): number {
  if (!(capacityKw > 0)) return 0
  const s = PM_SURYA_GHAR
  const tier1 = Math.min(capacityKw, s.firstTierMaxKw) * s.firstTierPerKwInr
  const tier2 =
    Math.max(0, Math.min(capacityKw, s.secondTierMaxKw) - s.firstTierMaxKw) * s.secondTierPerKwInr
  return Math.min(s.capInr, Math.round(tier1 + tier2))
}

/**
 * Applies PM Surya Ghar subsidy to gross system cost.
 */
export function adjustForSubsidy(
  grossCost: number,
  capacityOrAmount: number
): SubsidyAdjustment {
  const subsidyAmount =
    capacityOrAmount > 0 && capacityOrAmount <= 100
      ? calculatePMSuryaGharSubsidy(capacityOrAmount)
      : capacityOrAmount

  const netCost = Math.max(0, parseFloat((grossCost - subsidyAmount).toFixed(2)))

  return {
    grossCost,
    subsidyAmount,
    netCost,
  }
}
