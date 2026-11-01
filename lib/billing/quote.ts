/**
 * quote.ts — checks an installer's quote against the subsidy rules, its own arithmetic and the user's
 * profile. Prices are compared with the app's market estimate, which is labelled as an estimate.
 */
import { calculatePMSuryaGharSubsidy, PM_SURYA_GHAR } from '@/lib/calculations/financial'
import { SOLAR_COST_PER_KW_INR } from '@/lib/calculations/systemSizing'
import type { BillCheck, CheckStatus } from './reconcile'

export type QuoteFields = {
  capacityKw: number
  totalPriceInr: number
  priceIsAfterSubsidy: boolean | null
  subsidyStatedInr: number | null
  moduleBrand: string | null
  moduleWattage: number | null
  moduleCount: number | null
  dcrModules: boolean | null
  inverterBrand: string | null
  inverterCapacityKw: number | null
  performanceWarrantyYears: number | null
  includesNetMeter: boolean | null
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function checkQuote(
  q: QuoteFields,
  ctx: { sanctionedLoadKw?: number | null; recommendedKw?: number | null } = {}
): { checks: BillCheck[]; grossPriceInr: number; subsidyInr: number; netPriceInr: number; pricePerKwInr: number } {
  const checks: BillCheck[] = []
  const subsidy = calculatePMSuryaGharSubsidy(q.capacityKw)
  const gross = q.priceIsAfterSubsidy ? q.totalPriceInr + (q.subsidyStatedInr ?? subsidy) : q.totalPriceInr
  const perKw = gross / q.capacityKw

  // Capacity arithmetic.
  if (q.moduleCount && q.moduleWattage) {
    const dc = (q.moduleCount * q.moduleWattage) / 1000
    const ok = Math.abs(dc - q.capacityKw) / q.capacityKw <= 0.03
    checks.push({
      id: 'capacity',
      label: 'Panels add up to the quoted size',
      status: ok ? 'ok' : 'fail',
      detail: ok
        ? `${q.moduleCount} × ${q.moduleWattage} W = ${dc.toFixed(2)} kW.`
        : `${q.moduleCount} × ${q.moduleWattage} W is ${dc.toFixed(2)} kW, not the quoted ${q.capacityKw} kW. The subsidy is paid on installed capacity.`,
    })
  }

  // Subsidy amount.
  if (q.subsidyStatedInr != null) {
    const ok = Math.abs(q.subsidyStatedInr - subsidy) <= 500
    checks.push({
      id: 'subsidy',
      label: 'Subsidy amount',
      status: ok ? 'ok' : 'fail',
      detail: ok
        ? `${inr(subsidy)} is correct for ${q.capacityKw} kW.`
        : `The quote states ${inr(q.subsidyStatedInr)}; for ${q.capacityKw} kW the PM Surya Ghar subsidy is ${inr(subsidy)} (₹30,000/kW for 2 kW, ₹18,000 for the third, cap ${inr(PM_SURYA_GHAR.capInr)}).`,
    })
  }

  // DCR modules are required to claim the subsidy.
  checks.push({
    id: 'dcr',
    label: 'DCR (Indian-made) modules',
    status: q.dcrModules === true ? 'ok' : q.dcrModules === false ? 'fail' : 'warn',
    detail:
      q.dcrModules === true
        ? 'DCR modules are required for the subsidy. Ask for the DCR certificate with the invoice.'
        : q.dcrModules === false
          ? 'Non-DCR modules make the system ineligible for the PM Surya Ghar subsidy unless you choose to give it up.'
          : 'The quote does not say whether the modules are DCR. The subsidy requires DCR modules from the ALMM list; ask the installer to confirm in writing.',
  })

  // Price per kW against the market estimate.
  const ratio = perKw / SOLAR_COST_PER_KW_INR
  const priceStatus: CheckStatus = ratio > 1.25 ? 'warn' : ratio < 0.7 ? 'warn' : 'ok'
  checks.push({
    id: 'price',
    label: 'Price per kW',
    status: priceStatus,
    detail:
      priceStatus === 'ok'
        ? `${inr(perKw)} per kW before subsidy is within the usual range (estimate ${inr(SOLAR_COST_PER_KW_INR)}).`
        : ratio > 1.25
          ? `${inr(perKw)} per kW is ${Math.round((ratio - 1) * 100)}% above the ${inr(SOLAR_COST_PER_KW_INR)} market estimate. Compare at least two more quotes.`
          : `${inr(perKw)} per kW is unusually low against the ${inr(SOLAR_COST_PER_KW_INR)} estimate. Check module and inverter brands, structure and what is excluded.`,
  })

  // Inverter sizing (DC/AC ratio).
  if (q.inverterCapacityKw) {
    const dcAc = q.capacityKw / q.inverterCapacityKw
    const ok = dcAc >= 0.9 && dcAc <= 1.3
    checks.push({
      id: 'inverter',
      label: 'Inverter size',
      status: ok ? 'ok' : 'warn',
      detail: ok
        ? `${q.inverterCapacityKw} kW inverter for ${q.capacityKw} kW of panels (ratio ${dcAc.toFixed(2)}).`
        : `A ${q.inverterCapacityKw} kW inverter for ${q.capacityKw} kW of panels is a ratio of ${dcAc.toFixed(2)}; 1.0 to 1.3 is typical. ${dcAc > 1.3 ? 'Output will be clipped at midday.' : 'The inverter is oversized for the array.'}`,
    })
  }

  // Sanctioned load and recommendation.
  if (ctx.sanctionedLoadKw) {
    const ok = q.capacityKw <= ctx.sanctionedLoadKw
    checks.push({
      id: 'sanctioned-load',
      label: 'Within sanctioned load',
      status: ok ? 'ok' : 'warn',
      detail: ok
        ? `${q.capacityKw} kW is within your ${ctx.sanctionedLoadKw} kW sanctioned load.`
        : `${q.capacityKw} kW exceeds your ${ctx.sanctionedLoadKw} kW sanctioned load; a load enhancement is needed before net metering.`,
    })
  }
  if (ctx.recommendedKw) {
    const diff = q.capacityKw - ctx.recommendedKw
    checks.push({
      id: 'size-fit',
      label: 'Size vs your consumption',
      status: Math.abs(diff) <= 1 ? 'ok' : 'warn',
      detail:
        Math.abs(diff) <= 1
          ? `Close to the ${ctx.recommendedKw} kW recommended for your consumption.`
          : `Your consumption suggests about ${ctx.recommendedKw} kW. ${diff > 0 ? 'Extra export earns only the year-end APPC rate.' : 'A smaller system leaves more of your bill uncovered.'}`,
    })
  }

  if (q.includesNetMeter === false) {
    checks.push({ id: 'net-meter', label: 'Net meter', status: 'warn', detail: 'The quote excludes the net meter; ask who supplies and pays for it.' })
  }

  return {
    checks,
    grossPriceInr: Math.round(gross),
    subsidyInr: subsidy,
    netPriceInr: Math.round(gross - subsidy),
    pricePerKwInr: Math.round(perKw),
  }
}
