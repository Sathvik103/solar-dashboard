import { requireUser } from '@/lib/dal/users'
import { buildLedgerOverview } from '@/lib/billing/overview'
import { overallStatus } from '@/lib/billing/reconcile'
import { NET_METERING_SETTLEMENT_SOURCE } from '@/lib/calculations/tariffs'
import { EmptyState, Notice, Page, Stat, StatGrid, fmtInr, fmtNum } from '@/components/layout/Page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Legend } from '@/components/charts/EnergyCharts'
import LedgerChart from '@/components/billing/LedgerChart'
import BillChecker from '@/components/billing/BillChecker'
import ChecksList, { StatusPill } from '@/components/billing/ChecksList'
import AskButton from '@/components/assistant/AskButton'
import CountUp from '@/components/motion/CountUp'
import { deleteBillAction } from '@/actions/bills'

export const metadata = { title: 'Bills and credits' }

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const label = (m: string) => `${MONTH[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`
const SOURCE: Record<string, { text: string; variant: 'outline' | 'default' | 'secondary' }> = {
  bill: { text: 'Bill', variant: 'default' },
  meter: { text: 'Meter', variant: 'secondary' },
  forecast: { text: 'Forecast', variant: 'outline' },
}

export default async function BillingPage() {
  const user = await requireUser()
  const l = await buildLedgerOverview(user.id)
  const hasRows = l.rows.length > 0
  const usedValue = l.yearEndValueIfUsedInr

  return (
    <Page
      title="Bills and credits"
      description={`Net-metering credit for ${l.year.label} (April to March), and an automatic check of every bill against the tariff, your previous bill and your meter readings.`}
      actions={<AskButton question="How much net-metering credit will I have left on 31 March, and how should I use it?">Ask about credits</AskButton>}
    >
      <StatGrid>
        <Stat label="Credit banked now" value={hasRows ? <CountUp value={l.currentBankKwh} /> : '—'} unit="kWh" note="After the last month with a bill or meter data" />
        <Stat
          label="Projected on 31 March"
          value={l.yearEndBankKwh != null ? <CountUp value={l.yearEndBankKwh} /> : '—'}
          unit="kWh"
          note={l.yearEndBankKwh != null ? `${l.coverage.forecast} month(s) forecast` : 'Needs a system size and consumption to forecast'}
        />
        <Stat
          label="Year-end payout"
          value={l.yearEndPayoutInr != null ? <CountUp value={l.yearEndPayoutInr} prefix="₹" /> : '—'}
          tone={l.yearEndPayoutInr ? 'positive' : undefined}
          note="Unused credit paid at APPC"
        />
        <Stat
          label="Worth if used instead"
          value={usedValue != null ? <CountUp value={usedValue} prefix="₹" /> : '—'}
          tone={usedValue && l.yearEndPayoutInr != null && usedValue > l.yearEndPayoutInr ? 'primary' : undefined}
          note={l.marginalTariffInr ? `At your ₹${fmtNum(l.marginalTariffInr, 2)} top slab` : 'Needs consumption data'}
        />
      </StatGrid>

      {l.yearEndBankKwh != null && l.yearEndBankKwh > 50 && usedValue != null && l.yearEndPayoutInr != null && (
        <Notice>
          About {fmtNum(l.yearEndBankKwh)} kWh is likely to be unused by 31 March. It pays {fmtInr(l.yearEndPayoutInr)} at year end,
          but would save {fmtInr(usedValue)} if consumed instead, so shifting load (for example air conditioning, a water heater or EV
          charging) onto banked units before March is worth about {fmtInr(usedValue - l.yearEndPayoutInr)} more.
        </Notice>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Credit through the year</CardTitle>
            <CardDescription>
              Bars: net units each month (above zero billed, below zero banked). Line: credit balance. Faded bars are forecasts
              {l.forecastBasis
                ? ` from ${fmtNum(l.forecastBasis.capacityKw, 1)} kW${l.forecastBasis.calibrated ? ' calibrated to your readings' : ''} and your ${l.forecastBasis.consumption === 'bills' ? 'billing history' : 'profile consumption'}.`
                : '.'}
            </CardDescription>
          </div>
          <Legend
            items={[
              { label: 'Net import', color: 'var(--chart-2)' },
              { label: 'Net export', color: 'var(--chart-4)' },
              { label: 'Credit', color: 'var(--chart-1)', shape: 'line' },
            ]}
          />
        </CardHeader>
        <CardContent>
          {hasRows ? (
            <LedgerChart rows={l.rows} />
          ) : (
            <EmptyState title="No months yet">Check a bill below, or add a system size and consumption in Settings to forecast the year.</EmptyState>
          )}
        </CardContent>
        {hasRows && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Import</TableHead>
                <TableHead className="text-right">Export</TableHead>
                <TableHead className="text-right">Banked</TableHead>
                <TableHead className="text-right">Credit used</TableHead>
                <TableHead className="text-right">Billed units</TableHead>
                <TableHead className="text-right">Credit after</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {l.rows.map((r) => (
                <TableRow key={r.month} className={r.source === 'forecast' ? 'text-muted-foreground' : undefined}>
                  <TableCell>{label(r.month)}</TableCell>
                  <TableCell className="num text-right">{fmtNum(r.importKwh)}</TableCell>
                  <TableCell className="num text-right">{fmtNum(r.exportKwh)}</TableCell>
                  <TableCell className="num text-right">{r.bankedInKwh ? fmtNum(r.bankedInKwh) : '—'}</TableCell>
                  <TableCell className="num text-right">{r.bankUsedKwh ? fmtNum(r.bankUsedKwh) : '—'}</TableCell>
                  <TableCell className="num text-right">{fmtNum(r.billedUnits)}</TableCell>
                  <TableCell className="num text-right font-medium text-foreground">{fmtNum(r.closingBankKwh)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={SOURCE[r.source].variant}>{SOURCE[r.source].text}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Check a bill</CardTitle>
              <CardDescription>
                Upload a TSSPDCL or TGNPDCL bill. The values are read for you to confirm, then checked for billing arithmetic, the
                credit carried from your last bill, tariff slabs, fixed charge, and your own meter readings.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BillChecker />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your bills</CardTitle>
              <CardDescription>{l.bills.length ? `${l.bills.length} bill(s), newest first.` : 'Checked bills appear here.'}</CardDescription>
            </div>
          </CardHeader>
          {l.bills.length === 0 ? (
            <CardContent>
              <EmptyState title="No bills yet">Your first checked bill also fills in consumption for sizing and forecasts.</EmptyState>
            </CardContent>
          ) : (
            <ul className="divide-y border-t">
              {l.bills.map((b) => (
                <li key={b.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium">
                          {new Date(b.billingPeriodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to{' '}
                          {new Date(b.billingPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="num block text-[12px] text-muted-foreground">
                          {fmtInr(b.totalAmount)} · {b.importKwh != null ? `${fmtNum(b.importKwh)} in` : '—'} · {b.exportKwh != null ? `${fmtNum(b.exportKwh)} out` : '—'}
                        </span>
                      </span>
                      <StatusPill status={overallStatus(b.checks)} />
                    </summary>
                    <div className="space-y-3 px-5 pb-4">
                      <ChecksList checks={b.checks} />
                      <form action={deleteBillAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <Button type="submit" variant="ghost" size="xs">
                          Delete bill
                        </Button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Year-end settlement rate: {NET_METERING_SETTLEMENT_SOURCE}. Bills are read by the language model and never stored as files;
        only the values you confirm are saved.
      </p>
    </Page>
  )
}
