import { z } from 'zod'
import { requireUser } from '@/lib/dal/users'
import { buildLedgerOverview } from '@/lib/billing/overview'
import { NET_METERING_SETTLEMENT_SOURCE } from '@/lib/calculations/tariffs'
import { overallStatus } from '@/lib/billing/reconcile'

// Always the signed-in user's ledger.
export const GetNetMeteringLedgerSchema = z.object({})

export async function getNetMeteringLedgerTool() {
  const user = await requireUser()
  const l = await buildLedgerOverview(user.id)
  const latest = l.bills[0]
  return {
    year: l.year.label,
    rule: 'Monthly net = import - export. Net export is banked; net import uses banked credit first. Credit left on 31 March is paid at APPC and the bank restarts in April.',
    settlementRate: NET_METERING_SETTLEMENT_SOURCE,
    currentCreditKwh: l.currentBankKwh,
    projectedYearEndCreditKwh: l.yearEndBankKwh,
    projectedPayoutInr: l.yearEndPayoutInr,
    valueIfConsumedInr: l.yearEndValueIfUsedInr,
    marginalTariffInr: l.marginalTariffInr,
    monthsBySource: l.coverage,
    forecastBasis: l.forecastBasis,
    months: l.rows.map((r) => ({
      month: r.month,
      source: r.source,
      importKwh: r.importKwh,
      exportKwh: r.exportKwh,
      billedUnits: r.billedUnits,
      creditAfterKwh: r.closingBankKwh,
    })),
    latestBill: latest
      ? {
          period: `${latest.billingPeriodStart} to ${latest.billingPeriodEnd}`,
          totalInr: latest.totalAmount,
          checkStatus: overallStatus(latest.checks),
          problems: latest.checks.filter((c) => c.status === 'fail' || c.status === 'warn').map((c) => c.detail),
        }
      : null,
    note: l.rows.length === 0 ? 'No bills, meter months or forecast yet. Ask the user to check a bill on the Bills page or add a system size.' : undefined,
  }
}
