/**
 * reconcile.ts — checks a bill against the tariff rules, its own arithmetic, the previous bill and the
 * user's meter data. Every check states what it compared; nothing is guessed.
 */
import { calculateTelanganaTariff, LT1_FIXED_CHARGE_PER_KW_INR } from '@/lib/calculations/tariffs'

export type BillFields = {
  billingPeriodStart: string
  billingPeriodEnd: string
  importKwh: number | null
  exportKwh: number | null
  bankedOpeningKwh: number | null
  bankedClosingKwh: number | null
  billedUnits: number | null
  energyCharge: number | null
  fixedCharge: number | null
  electricityDuty: number | null
  fuelSurcharge: number | null
  otherCharges: number | null
  totalAmount: number
}

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skipped'
export type BillCheck = { id: string; label: string; status: CheckStatus; detail: string }

export type ReconcileContext = {
  /** Previous bill's closing banked units. */
  previousClosingBankKwh?: number | null
  sanctionedLoadKw?: number | null
  /** Import/export recorded by the user's devices or logs over the bill period. */
  meter?: { importKwh: number; exportKwh: number; daysCovered: number } | null
}

const kwh = (n: number) => `${Math.round(n * 10) / 10} kWh`
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const pct = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : 1) : Math.abs(a - b) / b)

export function periodDays(f: Pick<BillFields, 'billingPeriodStart' | 'billingPeriodEnd'>): number {
  return Math.round((Date.parse(f.billingPeriodEnd) - Date.parse(f.billingPeriodStart)) / 86_400_000)
}

export function reconcileBill(f: BillFields, ctx: ReconcileContext = {}): BillCheck[] {
  const checks: BillCheck[] = []
  const days = periodDays(f)

  // 1. Net-metering arithmetic on the bill itself.
  if (f.importKwh != null && f.exportKwh != null && f.bankedOpeningKwh != null) {
    const net = f.importKwh - f.exportKwh
    const expectedBilled = Math.max(0, net - f.bankedOpeningKwh)
    const expectedClosing = Math.max(0, f.bankedOpeningKwh - net)
    const billedOk = f.billedUnits == null || Math.abs(f.billedUnits - expectedBilled) <= 1
    const closingOk = f.bankedClosingKwh == null || Math.abs(f.bankedClosingKwh - expectedClosing) <= 1
    checks.push({
      id: 'net-arithmetic',
      label: 'Units billed after credits',
      status: billedOk && closingOk ? 'ok' : 'fail',
      detail:
        billedOk && closingOk
          ? `Import ${kwh(f.importKwh)} − export ${kwh(f.exportKwh)} − banked ${kwh(f.bankedOpeningKwh)} gives ${kwh(expectedBilled)} billed and ${kwh(expectedClosing)} carried forward, as printed.`
          : `Expected ${kwh(expectedBilled)} billed and ${kwh(expectedClosing)} carried forward from the printed import, export and opening credit; the bill shows ${f.billedUnits != null ? kwh(f.billedUnits) : '—'} billed and ${f.bankedClosingKwh != null ? kwh(f.bankedClosingKwh) : '—'} carried forward.`,
    })
  } else {
    checks.push({ id: 'net-arithmetic', label: 'Units billed after credits', status: 'skipped', detail: 'Needs import, export and opening banked units from the bill.' })
  }

  // 2. Credit carried over from the previous bill.
  if (ctx.previousClosingBankKwh != null && f.bankedOpeningKwh != null) {
    const ok = Math.abs(ctx.previousClosingBankKwh - f.bankedOpeningKwh) <= 1
    checks.push({
      id: 'credit-continuity',
      label: 'Credit carried from last bill',
      status: ok ? 'ok' : 'fail',
      detail: ok
        ? `Opening credit ${kwh(f.bankedOpeningKwh)} matches last bill's closing credit.`
        : `Last bill closed with ${kwh(ctx.previousClosingBankKwh)} banked, but this bill opens with ${kwh(f.bankedOpeningKwh)}. Ask the DISCOM to correct the carried-forward credit.`,
    })
  } else {
    checks.push({ id: 'credit-continuity', label: 'Credit carried from last bill', status: 'skipped', detail: 'Needs the previous bill and this bill’s opening credit.' })
  }

  // 3. Energy charge against the LT-I slab ladder (scaled to a 30-day month for the period length).
  const units = f.billedUnits ?? (f.importKwh != null && f.exportKwh == null ? f.importKwh : null)
  if (units != null && f.energyCharge != null) {
    const monthly = days > 0 ? (units * 30) / days : units
    const expected = (calculateTelanganaTariff(monthly).energyChargesInr * days) / 30
    const diff = f.energyCharge - expected
    const status: CheckStatus = Math.abs(diff) <= Math.max(10, expected * 0.03) ? 'ok' : Math.abs(diff) <= expected * 0.1 ? 'warn' : 'fail'
    checks.push({
      id: 'energy-charge',
      label: 'Energy charge vs tariff slabs',
      status,
      detail:
        status === 'ok'
          ? `${inr(f.energyCharge)} matches the LT-I slabs for ${kwh(units)} over ${days} days (${inr(expected)}).`
          : `The LT-I slabs give ${inr(expected)} for ${kwh(units)} over ${days} days; the bill charges ${inr(f.energyCharge)} (${diff > 0 ? '+' : ''}${inr(diff)}). Billing periods and category can explain small differences.`,
    })
  } else {
    checks.push({ id: 'energy-charge', label: 'Energy charge vs tariff slabs', status: 'skipped', detail: 'Needs billed units and the energy charge.' })
  }

  // 4. Fixed charge against sanctioned load.
  if (ctx.sanctionedLoadKw && f.fixedCharge != null) {
    const expected = (LT1_FIXED_CHARGE_PER_KW_INR * Math.ceil(ctx.sanctionedLoadKw) * days) / 30
    const ok = Math.abs(f.fixedCharge - expected) <= Math.max(5, expected * 0.1)
    checks.push({
      id: 'fixed-charge',
      label: 'Fixed charge vs sanctioned load',
      status: ok ? 'ok' : 'warn',
      detail: ok
        ? `${inr(f.fixedCharge)} fits ₹${LT1_FIXED_CHARGE_PER_KW_INR}/kW for ${ctx.sanctionedLoadKw} kW.`
        : `Expected about ${inr(expected)} for a ${ctx.sanctionedLoadKw} kW sanctioned load; the bill shows ${inr(f.fixedCharge)}. Check the sanctioned load printed on the bill.`,
    })
  } else {
    checks.push({ id: 'fixed-charge', label: 'Fixed charge vs sanctioned load', status: 'skipped', detail: 'Add your sanctioned load in Settings to check this.' })
  }

  // 5. Totals add up.
  const parts = [f.energyCharge, f.fixedCharge, f.electricityDuty, f.fuelSurcharge, f.otherCharges]
  if (parts.filter((p) => p != null).length >= 2) {
    const sum = parts.reduce<number>((a, p) => a + (p ?? 0), 0)
    const ok = Math.abs(sum - f.totalAmount) <= 2
    checks.push({
      id: 'total',
      label: 'Charges add up to the total',
      status: ok ? 'ok' : 'warn',
      detail: ok
        ? `Itemised charges sum to ${inr(sum)}.`
        : `Itemised charges sum to ${inr(sum)} but the total is ${inr(f.totalAmount)}. Arrears, rebates or rounding may explain it.`,
    })
  }

  // 6–7. Export and import against the user's own meter data.
  const coverage = ctx.meter && days > 0 ? ctx.meter.daysCovered / days : 0
  for (const [id, label, billed, measured] of [
    ['export-vs-meter', 'Export vs your meter', f.exportKwh, ctx.meter?.exportKwh],
    ['import-vs-meter', 'Import vs your meter', f.importKwh, ctx.meter?.importKwh],
  ] as const) {
    if (billed == null || measured == null || coverage < 0.8) {
      checks.push({
        id,
        label,
        status: 'skipped',
        detail: coverage < 0.8 && ctx.meter ? `Your readings cover ${ctx.meter.daysCovered} of ${days} days; at least 80% is needed.` : 'Needs device or logged readings for this period.',
      })
      continue
    }
    const d = pct(billed, measured)
    const status: CheckStatus = d <= 0.05 ? 'ok' : d <= 0.15 ? 'warn' : 'fail'
    checks.push({
      id,
      label,
      status,
      detail:
        status === 'ok'
          ? `Bill ${kwh(billed)}, your readings ${kwh(measured)}.`
          : `The bill shows ${kwh(billed)} but your readings total ${kwh(measured)} (${Math.round(d * 100)}% apart). ${id === 'export-vs-meter' && billed < measured ? 'You may be under-credited for exports; ask TSSPDCL to check the net meter reading.' : 'Compare the meter reading dates with your data.'}`,
    })
  }

  return checks
}

export function overallStatus(checks: BillCheck[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  if (checks.every((c) => c.status === 'skipped')) return 'skipped'
  return 'ok'
}
