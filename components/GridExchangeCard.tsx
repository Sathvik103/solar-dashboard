import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, PlugZap, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardOverview } from '@/lib/dashboard/overview'

const kwh = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kWh`
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

const SOURCE_LABEL: Record<string, string> = {
  inverter_telemetry: 'Device telemetry',
  manual_log: 'Manual log',
  estimated: 'Estimate',
}

export default function GridExchangeCard({
  grid,
  billEstimate,
  loadCheck,
}: Pick<DashboardOverview, 'grid' | 'billEstimate' | 'loadCheck'>) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <PlugZap className="h-4 w-4 text-emerald-600" />
          <span>Grid exchange (last 30 days)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {grid ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3" /> Exported
                </span>
                <span className="font-bold text-foreground">{kwh(grid.exportedKwh)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowDownLeft className="h-3 w-3" /> Imported
                </span>
                <span className="font-bold text-foreground">{kwh(grid.importedKwh)}</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Net {grid.netExportKwh >= 0 ? 'surplus' : 'draw'}:{' '}
              <span className="font-semibold text-foreground">{kwh(Math.abs(grid.netExportKwh))}</span>
              {grid.surplusValueAtAppcInr != null && (
                <> · worth ~{inr(grid.surplusValueAtAppcInr)} at APPC if still unadjusted on 31 March</>
              )}
            </p>
            <p className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
              Last reading {grid.lastReadingDate}
              <Badge variant="outline" className="text-[10px]">
                {SOURCE_LABEL[grid.lastReadingSource] ?? grid.lastReadingSource}
              </Badge>
              · {grid.days} day(s) logged
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            No meter readings yet. <Link href="/history" className="underline">Log a day</Link> or{' '}
            <Link href="/profile" className="underline">connect a device</Link>.
          </p>
        )}

        {billEstimate && (
          <p className="text-muted-foreground border-t pt-2">
            Typical bill ({billEstimate.monthlyUnits} kWh, {billEstimate.subcategory}):{' '}
            <span className="font-semibold text-foreground">{inr(billEstimate.totalInr)}</span>
            <span className="block text-[10px]">
              Excludes electricity duty and FSA.
              {billEstimate.fixedChargeBasis === 'minimum-1kw' &&
                ' Fixed charge assumes 1 kW; add your sanctioned load in your profile.'}
            </span>
          </p>
        )}

        {loadCheck?.exceeds && (
          <p role="alert" className="flex gap-1.5 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            A {loadCheck.capacityKw} kW system exceeds your {loadCheck.sanctionedLoadKw} kW sanctioned load. Net-metering
            capacity is limited to the sanctioned load, so you may need to apply for a load enhancement first.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
