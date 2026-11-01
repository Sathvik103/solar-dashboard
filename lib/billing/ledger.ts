/**
 * ledger.ts — Telangana net-metering credit ledger for one settlement year (1 April to 31 March).
 *
 * Each billing month: net = import − export.
 *   - Net export is banked as a unit credit and carried forward.
 *   - Net import is first offset from the bank; only the remainder is billed.
 *   - Units still banked on 31 March are paid out at the TGERC average pooled power purchase cost (APPC)
 *     and the bank restarts at zero in April.
 * When a bill states its closing banked units, that figure is authoritative and replaces the running
 * balance (the bill check flags any difference).
 */

export type LedgerSource = 'bill' | 'meter' | 'forecast'

export type LedgerMonthInput = {
  /** YYYY-MM */
  month: string
  importKwh: number
  exportKwh: number
  source: LedgerSource
  /** Closing banked units printed on the bill, if any. */
  billClosingBankKwh?: number | null
}

export type LedgerRow = LedgerMonthInput & {
  netKwh: number
  bankedInKwh: number
  bankUsedKwh: number
  billedUnits: number
  closingBankKwh: number
}

export type Ledger = {
  year: { label: string; months: string[] }
  rows: LedgerRow[]
  /** Balance after the last month with actual (bill or meter) data. */
  currentBankKwh: number
  /** Balance on 31 March including forecast months; null when the year is not fully covered. */
  yearEndBankKwh: number | null
  yearEndPayoutInr: number | null
  /** Rupee value of the year-end balance if it were used instead, at the given marginal tariff. */
  yearEndValueIfUsedInr: number | null
  coverage: { actual: number; forecast: number; missing: number }
}

const pad = (n: number) => String(n).padStart(2, '0')
const r1 = (n: number) => Math.round(n * 10) / 10

/** Settlement year containing `date` (IST calendar month). */
export function settlementYear(date: Date): { label: string; months: string[] } {
  const ist = new Date(date.getTime() + 5.5 * 3600_000)
  const y = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = (3 + i) % 12
    return `${m < 3 ? y + 1 : y}-${pad(m + 1)}`
  })
  return { label: `FY ${y}-${String((y + 1) % 100).padStart(2, '0')}`, months }
}

export function runLedger(
  year: { label: string; months: string[] },
  inputs: LedgerMonthInput[],
  opts: { appcInrPerKwh: number; marginalTariffInrPerKwh?: number | null }
): Ledger {
  const byMonth = new Map(inputs.map((i) => [i.month, i]))
  let bank = 0
  let currentBank = 0
  const rows: LedgerRow[] = []
  let actual = 0
  let forecast = 0

  for (const month of year.months) {
    const input = byMonth.get(month)
    if (!input) continue
    const net = input.importKwh - input.exportKwh
    let bankedIn = 0
    let used = 0
    let billed = 0
    if (net < 0) {
      bankedIn = -net
      bank += bankedIn
    } else {
      used = Math.min(bank, net)
      billed = net - used
      bank -= used
    }
    if (input.source === 'bill' && input.billClosingBankKwh != null) bank = input.billClosingBankKwh
    rows.push({
      ...input,
      netKwh: r1(net),
      bankedInKwh: r1(bankedIn),
      bankUsedKwh: r1(used),
      billedUnits: r1(billed),
      closingBankKwh: r1(bank),
    })
    if (input.source === 'forecast') forecast++
    else {
      actual++
      currentBank = bank
    }
  }

  const complete = rows.length === 12
  const yearEnd = complete ? r1(bank) : null
  return {
    year,
    rows,
    currentBankKwh: r1(currentBank),
    yearEndBankKwh: yearEnd,
    yearEndPayoutInr: yearEnd != null ? Math.round(yearEnd * opts.appcInrPerKwh) : null,
    yearEndValueIfUsedInr:
      yearEnd != null && opts.marginalTariffInrPerKwh ? Math.round(yearEnd * opts.marginalTariffInrPerKwh) : null,
    coverage: { actual, forecast, missing: 12 - rows.length },
  }
}
