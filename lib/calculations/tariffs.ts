/**
 * tariffs.ts — Telangana LT-I (Domestic) bill calculation.
 *
 * Source: TGSPDCL/TGNPDCL Retail Supply Tariff Schedule, FY 2025-26 (01.05.2025),
 * retained unchanged by the TGERC Retail Supply Tariff Order for FY 2026-27 (from 01.04.2026).
 * https://tgsouthernpower.org/currentyeartarifforders
 *
 * The LT-I category is chosen by total monthly consumption, and each category has its own
 * telescopic slab ladder (a 150-unit household is billed on the LT-I(B) ladder from unit 1).
 * Electricity duty, FSA/FCA and ToD adjustments are billed extra by the DISCOM and are NOT
 * included; estimates are therefore slightly below a real bill.
 */

export const TARIFF_SOURCE = {
  schedule: 'TGSPDCL Retail Supply Tariff Schedule FY 2025-26, retained for FY 2026-27',
  effectiveFrom: '2026-04-01',
  url: 'https://tgsouthernpower.org/currentyeartarifforders',
  excludes: ['Electricity duty (TS Electricity Duty Act, 1939)', 'FSA/FCA', 'Time-of-day adjustments'],
} as const

/** Fixed charge per kW of contracted load per month for LT-I. */
export const LT1_FIXED_CHARGE_PER_KW_INR = 10

/**
 * Annual surplus settlement under net metering is at the TGERC-determined Average Pooled
 * Power Purchase Cost (APPC). FY 2025-26 APPC: ₹5.330/kWh (TGERC order, Sept 2026).
 */
export const NET_METERING_SETTLEMENT_INR_PER_KWH = 5.33
export const NET_METERING_SETTLEMENT_SOURCE = 'TGERC APPC for FY 2025-26 (₹5.330/kWh)'

export type TariffCategory = 'domestic'

type Slab = { upTo: number; rate: number }

export type Lt1Subcategory = 'LT-I(A)' | 'LT-I(B)' | 'LT-I(C)'

const LT1_LADDERS: { maxMonthlyUnits: number; sub: Lt1Subcategory; slabs: Slab[] }[] = [
  {
    maxMonthlyUnits: 100,
    sub: 'LT-I(A)',
    slabs: [
      { upTo: 50, rate: 1.95 },
      { upTo: 100, rate: 3.1 },
    ],
  },
  {
    maxMonthlyUnits: 200,
    sub: 'LT-I(B)',
    slabs: [
      { upTo: 100, rate: 3.4 },
      { upTo: 200, rate: 4.8 },
    ],
  },
  {
    maxMonthlyUnits: Infinity,
    sub: 'LT-I(C)',
    slabs: [
      { upTo: 200, rate: 5.1 },
      { upTo: 300, rate: 7.7 },
      { upTo: 400, rate: 9.0 },
      { upTo: 800, rate: 9.5 },
      { upTo: Infinity, rate: 10.0 },
    ],
  },
]

export type SlabBreakdown = {
  slab: string
  units: number
  ratePerUnit: number
  totalInr: number
}

export type TariffCalculationResult = {
  monthlyUnitsKwh: number
  category: TariffCategory
  subcategory: Lt1Subcategory
  slabs: SlabBreakdown[]
  energyChargesInr: number
  fixedChargesInr: number
  estimatedTotalBillInr: number
  /** Total (energy + fixed) per unit; null when there is no consumption. */
  effectiveRatePerUnit: number | null
  /** Rate the last unit is billed at — what each solar-offset unit saves. */
  marginalRatePerUnit: number
  source: typeof TARIFF_SOURCE
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function calculateTelanganaTariff(
  monthlyUnitsKwh: number,
  options: { contractedLoadKw?: number } = {}
): TariffCalculationResult {
  const units = Math.max(0, monthlyUnitsKwh)
  const ladder = LT1_LADDERS.find((l) => units <= l.maxMonthlyUnits)!

  const slabs: SlabBreakdown[] = []
  let prev = 0
  let energy = 0
  let marginal = ladder.slabs[0].rate
  for (const s of ladder.slabs) {
    if (units <= prev) break
    const inSlab = Math.min(units, s.upTo) - prev
    const cost = inSlab * s.rate
    energy += cost
    marginal = s.rate
    slabs.push({
      slab: `${prev + 1}-${s.upTo === Infinity ? '' : s.upTo} kWh`.replace(/-$/, '+'),
      units: inSlab,
      ratePerUnit: s.rate,
      totalInr: round2(cost),
    })
    prev = s.upTo
  }

  const fixed = LT1_FIXED_CHARGE_PER_KW_INR * Math.max(1, Math.ceil(options.contractedLoadKw ?? 1))
  const total = round2(energy + fixed)

  return {
    monthlyUnitsKwh,
    category: 'domestic',
    subcategory: ladder.sub,
    slabs,
    energyChargesInr: round2(energy),
    fixedChargesInr: fixed,
    estimatedTotalBillInr: total,
    effectiveRatePerUnit: units > 0 ? round2(total / units) : null,
    marginalRatePerUnit: marginal,
    source: TARIFF_SOURCE,
  }
}
