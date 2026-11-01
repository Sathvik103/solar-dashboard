import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Page, Stat, StatGrid, fmtInr, fmtNum } from '@/components/layout/Page'
import DataEntryPanel from '@/components/DataEntryPanel'
import { DailyEnergyChart, Legend } from '@/components/charts/EnergyCharts'
import { requireUser } from '@/lib/dal/users'
import { buildDashboardOverview } from '@/lib/dashboard/overview'
import { computeEnergyStatistics, getUserConsumptionHistory } from '@/lib/dal/analytics'

export const metadata = { title: 'Energy log' }

const SOURCE_LABEL: Record<string, string> = {
  user_entered: 'Manual',
  bill_import: 'CSV',
  estimated: 'Estimate',
}

export default async function HistoryPage() {
  const user = await requireUser()
  const [overview, consumption] = await Promise.all([buildDashboardOverview(user.id), getUserConsumptionHistory(user.id)])
  const days = [...overview.daily].reverse()
  const bills = [...consumption].reverse().slice(0, 24)
  const stats = computeEnergyStatistics(consumption)
  const logged = overview.daily.filter((d) => d.loggedKwh != null)
  const loggedTotal = logged.reduce((a, d) => a + (d.loggedKwh ?? 0), 0)
  const savedTotal = logged.reduce((a, d) => a + (d.savedInr ?? 0), 0)

  return (
    <Page
      title="Energy log"
      description="Logged values are what you or your devices recorded. Modelled values come from observed weather for your system and are estimates, not meter readings."
    >
      <DataEntryPanel />

      <StatGrid>
        <Stat label="Logged, 30 days" value={logged.length ? fmtNum(loggedTotal, 1) : '—'} unit="kWh" note={`${logged.length} day(s) with readings`} />
        <Stat
          label="Saved, 30 days"
          value={logged.length && overview.tariffInrPerKwh != null ? fmtInr(savedTotal) : '—'}
          tone={savedTotal > 0 ? 'positive' : undefined}
          note="Generation valued at your tariff"
        />
        <Stat
          label="Average use"
          value={stats.averageMonthlyConsumption != null ? fmtNum(stats.averageMonthlyConsumption) : '—'}
          unit="kWh/mo"
          note={`${stats.totalRecords} bill(s) on record`}
        />
        <Stat
          label="Year on year"
          value={
            stats.yoyConsumptionChangePercent != null
              ? `${stats.yoyConsumptionChangePercent > 0 ? '+' : ''}${fmtNum(stats.yoyConsumptionChangePercent, 1)}%`
              : '—'
          }
          note={stats.yoyConsumptionChangePercent != null ? 'Consumption, last 12 vs prior 12 months' : 'Needs 24 months of bills'}
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Daily generation</CardTitle>
            <CardDescription>
              {overview.basis
                ? `Modelled for ${fmtNum(overview.basis.capacityKw, 1)} kW${overview.calibration ? `, calibrated ×${overview.calibration.factor}` : ''}.`
                : 'Complete your profile to see modelled output.'}
            </CardDescription>
          </div>
          <Legend
            items={[
              { label: 'Logged', color: 'var(--chart-2)' },
              { label: 'Modelled', color: 'var(--chart-1)', shape: 'line' },
            ]}
          />
        </CardHeader>
        {days.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No readings yet">Add a daily reading above, import a CSV, or connect a device in Settings.</EmptyState>
          </div>
        ) : (
          <>
            <div className="px-5 pb-4">
              <DailyEnergyChart data={overview.daily} height={200} />
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Logged</TableHead>
                  <TableHead className="text-right">Modelled</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Saved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => {
                  const diff = d.loggedKwh != null && d.modelledKwh ? ((d.loggedKwh - d.modelledKwh) / d.modelledKwh) * 100 : null
                  return (
                    <TableRow key={d.date}>
                      <TableCell className="num">{d.date}</TableCell>
                      <TableCell className="num text-right">{d.loggedKwh != null ? fmtNum(d.loggedKwh, 2) : '—'}</TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {d.modelledKwh != null ? fmtNum(d.modelledKwh, 2) : '—'}
                      </TableCell>
                      <TableCell
                        className={`num text-right ${diff == null ? 'text-muted-foreground' : Math.abs(diff) > 20 ? 'text-warning' : ''}`}
                      >
                        {diff != null ? `${diff > 0 ? '+' : ''}${fmtNum(diff, 1)}%` : '—'}
                      </TableCell>
                      <TableCell className="num text-right">{d.savedInr != null ? fmtInr(d.savedInr) : '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Monthly bills</CardTitle>
            <CardDescription>The most recent 24 months.</CardDescription>
          </div>
        </CardHeader>
        {bills.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No bills recorded">Add a monthly bill above to improve sizing and savings figures.</EmptyState>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Bill</TableHead>
                <TableHead className="text-right">Per unit</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.month} {b.year}
                  </TableCell>
                  <TableCell className="num text-right">{fmtNum(b.consumptionKwh)} kWh</TableCell>
                  <TableCell className="num text-right">{fmtInr(b.billAmount)}</TableCell>
                  <TableCell className="num text-right text-muted-foreground">
                    {b.consumptionKwh > 0 ? `₹${fmtNum(b.billAmount / b.consumptionKwh, 2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{SOURCE_LABEL[b.source] ?? b.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Page>
  )
}
