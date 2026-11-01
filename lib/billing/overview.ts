import 'server-only'

import { listBills, type BillRecord } from '@/lib/dal/bills'
import { getGenerationHistory, getUserConsumptionHistory } from '@/lib/dal/analytics'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { buildDashboardOverview } from '@/lib/dashboard/overview'
import { geocode, getMonthlyClimatology } from '@/lib/data/weather'
import { runSolarMLInference } from '@/lib/ml/inference'
import { calculateTelanganaTariff, NET_METERING_SETTLEMENT_INR_PER_KWH } from '@/lib/calculations/tariffs'
import { runLedger, settlementYear, type Ledger, type LedgerMonthInput } from './ledger'

export type LedgerOverview = Ledger & {
  bills: BillRecord[]
  forecastBasis: { capacityKw: number; calibrated: boolean; consumption: 'bills' | 'profile' } | null
  marginalTariffInr: number | null
}

const monthOf = (iso: string) => iso.slice(0, 7)

/** Month a bill belongs to: the month containing the middle of its period. */
function billMonth(b: Pick<BillRecord, 'billingPeriodStart' | 'billingPeriodEnd'>): string {
  return new Date((Date.parse(b.billingPeriodStart) + Date.parse(b.billingPeriodEnd)) / 2).toISOString().slice(0, 7)
}

/**
 * Net-metering ledger for the current settlement year. Each month uses, in order of preference:
 * the bill, then the user's meter data (if at least 25 days are recorded), then a forecast of net
 * consumption minus calibrated generation. Forecasts need a system size and consumption history.
 */
export async function buildLedgerOverview(userId: string, now = new Date()): Promise<LedgerOverview> {
  const year = settlementYear(now)
  const thisMonth = new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 7)

  const [bills, generation, consumption, profile, overview] = await Promise.all([
    listBills(userId),
    getGenerationHistory(400, userId),
    getUserConsumptionHistory(userId),
    getSolarProfile(userId),
    buildDashboardOverview(userId),
  ])

  const inputs = new Map<string, LedgerMonthInput>()

  for (const b of bills) {
    const m = billMonth(b)
    if (!year.months.includes(m) || inputs.has(m) || b.importKwh == null) continue
    inputs.set(m, { month: m, importKwh: b.importKwh, exportKwh: b.exportKwh ?? 0, source: 'bill', billClosingBankKwh: b.bankedClosingKwh })
  }

  const meterByMonth = new Map<string, { imp: number; exp: number; days: number }>()
  for (const g of generation) {
    const m = monthOf(g.recordDate)
    const cur = meterByMonth.get(m) ?? { imp: 0, exp: 0, days: 0 }
    cur.imp += g.gridImportKwh
    cur.exp += g.exportedKwh
    cur.days += 1
    meterByMonth.set(m, cur)
  }
  for (const [m, v] of meterByMonth) {
    if (!year.months.includes(m) || inputs.has(m) || v.days < 25 || m === thisMonth) continue
    inputs.set(m, { month: m, importKwh: v.imp, exportKwh: v.exp, source: 'meter' })
  }

  // Forecast the remaining months: consumption from the same month last year (else average), minus
  // generation from measured climatology for the system size, scaled by the user's calibration.
  let forecastBasis: LedgerOverview['forecastBasis'] = null
  const avgConsumption = consumption.length
    ? consumption.reduce((a, c) => a + c.consumptionKwh, 0) / consumption.length
    : profile?.monthlyUnitsKwh ?? null
  if (overview.basis && avgConsumption) {
    let climate
    try {
      const coords = overview.location ?? (await geocode(profile?.city || 'Hyderabad', profile?.state))
      climate = (await getMonthlyClimatology(coords)).map((c) => ({ month: '', ghi: c.ghiKwhM2Day, avgTempC: c.tempC }))
    } catch {
      climate = undefined
    }
    const curve = runSolarMLInference({
      capacityKw: overview.basis.capacityKw,
      roofAreaSqft: overview.basis.capacityKw * 100,
      shadingLevel: profile?.shadingLevel === 'heavy' || profile?.shadingLevel === 'high' ? 'heavy' : profile?.shadingLevel ? 'partial' : 'none',
      climate,
    })
    const k = overview.calibration?.factor ?? 1
    for (const m of year.months) {
      if (inputs.has(m) || m < thisMonth) continue
      const monthIdx = Number(m.slice(5, 7)) - 1
      const sameMonth = consumption.find((c) => Number(c.recordDate.slice(5, 7)) - 1 === monthIdx)
      const use = sameMonth?.consumptionKwh ?? avgConsumption
      const gen = curve.monthlyCurve[monthIdx].monthlyKwh * k
      const net = use - gen
      inputs.set(m, { month: m, importKwh: Math.max(0, net), exportKwh: Math.max(0, -net), source: 'forecast' })
    }
    forecastBasis = {
      capacityKw: overview.basis.capacityKw,
      calibrated: !!overview.calibration,
      consumption: consumption.length ? 'bills' : 'profile',
    }
  }

  const marginal = avgConsumption ? calculateTelanganaTariff(avgConsumption).marginalRatePerUnit : null
  const ledger = runLedger(year, [...inputs.values()], {
    appcInrPerKwh: NET_METERING_SETTLEMENT_INR_PER_KWH,
    marginalTariffInrPerKwh: marginal,
  })
  return { ...ledger, bills, forecastBasis, marginalTariffInr: marginal }
}
