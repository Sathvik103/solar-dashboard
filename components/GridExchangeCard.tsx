import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtInr, fmtNum } from '@/components/layout/Page'
import type { DashboardOverview } from '@/lib/dashboard/overview'

const SOURCE_LABEL: Record<string, string> = {
  inverter_telemetry: 'Device',
  manual_log: 'Manual',
  estimated: 'Estimate',
}

export default function GridExchangeCard({
  grid,
  billEstimate,
  loadCheck,
}: Pick<DashboardOverview, 'grid' | 'billEstimate' | 'loadCheck'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grid exchange</CardTitle>
        {grid && (
          <Badge variant="outline">{SOURCE_LABEL[grid.lastReadingSource] ?? grid.lastReadingSource}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-[13px]">
        {grid ? (
          <>
            <dl className="divide-y">
              {[
                ['Exported', `${fmtNum(grid.exportedKwh, 1)} kWh`],
                ['Imported', `${fmtNum(grid.importedKwh, 1)} kWh`],
                ['Used on site', `${fmtNum(grid.selfConsumedKwh, 1)} kWh`],
                [grid.netExportKwh >= 0 ? 'Net surplus' : 'Net draw', `${fmtNum(Math.abs(grid.netExportKwh), 1)} kWh`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] text-muted-foreground">
              {grid.days} day(s) in the last 30, latest {grid.lastReadingDate}.
              {grid.surplusValueAtAppcInr != null &&
                ` Surplus worth about ${fmtInr(grid.surplusValueAtAppcInr)} if still unadjusted on 31 March.`}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            No meter readings yet.{' '}
            <Link href="/history" className="text-primary underline underline-offset-2">
              Log a day
            </Link>{' '}
            or{' '}
            <Link href="/profile" className="text-primary underline underline-offset-2">
              connect a device
            </Link>
            .
          </p>
        )}

        {billEstimate && (
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Typical bill</span>
              <span className="num">{fmtInr(billEstimate.totalInr)}</span>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {fmtNum(billEstimate.monthlyUnits)} kWh on {billEstimate.subcategory}, before duty and FSA.
              {billEstimate.fixedChargeBasis === 'minimum-1kw' && ' Fixed charge assumes 1 kW sanctioned load.'}
            </p>
          </div>
        )}

        {loadCheck?.exceeds && (
          <p role="alert" className="border-t pt-3 text-[12px] text-warning">
            {fmtNum(loadCheck.capacityKw, 1)} kW is above your {fmtNum(loadCheck.sanctionedLoadKw, 1)} kW sanctioned
            load. Net-metering capacity is limited to sanctioned load, so a load enhancement may be needed first.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
