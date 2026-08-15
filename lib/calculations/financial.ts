/**
 * financial.ts — Financial projection calculation engine (skeleton)
 *
 * Phase 1: Type definitions and function stubs only.
 * Full implementations are deferred to Phase 5 (Solar Simulator).
 *
 * Req 3.6 — expose financial projection functions as named exports.
 */

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export type NPVInput = {
  /** Total installation cost in ₹ */
  initialInvestment: number
  /** Annual savings in ₹ */
  annualSavings: number
  /** Annual discount rate as a decimal (e.g. 0.08 for 8%) */
  discountRate: number
  /** Project lifetime in years */
  years: number
}

export type NPVResult = {
  /** Net Present Value in ₹ */
  npv: number
  /** True if NPV > 0 (project is financially viable at given discount rate) */
  isViable: boolean
}

export type SavingsProjection = {
  /** Total installation cost in ₹ */
  initialInvestment: number
  /** First-year annual savings in ₹ */
  annualSavings: number
  /** Annual panel degradation rate as a decimal (e.g. 0.005 for 0.5%) */
  degradationRate: number
  /** Annual electricity tariff escalation rate as a decimal (e.g. 0.05 for 5%) */
  tariffEscalationRate: number
  /** Projection period in years (typically 25) */
  years: number
}

export type SubsidyAdjustment = {
  /** Gross installation cost in ₹ before subsidy */
  grossCost: number
  /** Subsidy as a fraction of gross cost (0–1) or as a fixed ₹ amount */
  subsidyRate: number
  /** Net cost after applying subsidy */
  netCost: number
}

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

/**
 * Calculates the Net Present Value of a solar installation over its lifetime.
 *
 * TODO: Phase 5 implementation — requires authoritative tariff and
 * discount rate data from the knowledge base (Phase 3+).
 */
export function calculateNPV(input: NPVInput): NPVResult {
  // TODO: Phase 5 implementation
  void input
  throw new Error('calculateNPV is not yet implemented — deferred to Phase 5')
}

/**
 * Projects cumulative savings over a given number of years, accounting for
 * panel degradation and electricity tariff escalation.
 *
 * TODO: Phase 5 implementation.
 */
export function calculate25YearSavings(input: SavingsProjection): number {
  // TODO: Phase 5 implementation
  void input
  throw new Error(
    'calculate25YearSavings is not yet implemented — deferred to Phase 5'
  )
}

/**
 * Adjusts a gross installation cost by applying a subsidy rate.
 *
 * NOTE: Subsidy rates must come from authoritative knowledge-base data
 * (Phase 3+). Do NOT use LLM-generated or user-supplied subsidy values
 * as authoritative inputs to this function.
 *
 * @param grossCost - Total installation cost in ₹ before subsidy
 * @param subsidyRate - Subsidy as a fraction (0–1), e.g. 0.30 for 30%
 * @returns SubsidyAdjustment with netCost calculated
 */
export function adjustForSubsidy(
  grossCost: number,
  subsidyRate: number
): SubsidyAdjustment {
  // TODO: Phase 5 — validate subsidyRate against knowledge-base data
  if (subsidyRate < 0 || subsidyRate > 1) {
    throw new RangeError(`subsidyRate must be between 0 and 1, got ${subsidyRate}`)
  }
  const netCost = parseFloat((grossCost * (1 - subsidyRate)).toFixed(2))
  return { grossCost, subsidyRate, netCost }
}
