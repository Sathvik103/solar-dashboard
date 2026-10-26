import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageWrapper from '@/components/layout/PageWrapper'
import DataEntryPanel from '@/components/DataEntryPanel'
import { requireUser } from '@/lib/dal/users'
import { buildDashboardOverview } from '@/lib/dashboard/overview'
import { getUserConsumptionHistory } from '@/lib/dal/analytics'

export const metadata = { title: 'History — Solar Intelligence Platform' }

export default async function HistoryPage() {
  const user = await requireUser()
  const [overview, consumption] = await Promise.all([
    buildDashboardOverview(user.id),
    getUserConsumptionHistory(user.id),
  ])
  const days = [...overview.daily].reverse().slice(0, 30)
  const bills = [...consumption].reverse().slice(0, 12)

  return (
    <PageWrapper>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generation & Billing History</h1>
        <p className="text-xs text-muted-foreground mt-1">
          “Logged” values are what you recorded. “Modelled” values are computed from observed weather
          (Open-Meteo/ERA5) for your system and are estimates, not meter readings.
        </p>
      </div>

      <DataEntryPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 days</CardTitle>
          <CardDescription className="text-xs">
            {overview.basis
              ? `Modelled for a ${overview.basis.capacityKw} kW system (${overview.basis.kind}).`
              : 'Complete your solar profile to see weather-modelled output.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data yet. Log a day of generation above or import a CSV.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Logged (kWh)</TableHead>
                  <TableHead>Modelled (kWh)</TableHead>
                  <TableHead>Saved (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>{d.loggedKwh != null ? d.loggedKwh.toFixed(2) : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.modelledKwh != null ? d.modelledKwh.toFixed(2) : '—'}
                    </TableCell>
                    <TableCell>{d.savedInr != null ? `₹${d.savedInr.toFixed(0)}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly bills</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bills recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Units (kWh)</TableHead>
                  <TableHead>Bill (₹)</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.month} {b.year}
                    </TableCell>
                    <TableCell>{b.consumptionKwh}</TableCell>
                    <TableCell>₹{b.billAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {b.source.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
