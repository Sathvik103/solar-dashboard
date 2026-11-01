import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/dal/users'
import { buildDashboardOverview } from '@/lib/dashboard/overview'
import { NET_METERING_SETTLEMENT_SOURCE, TARIFF_SOURCE } from '@/lib/calculations/tariffs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, Notice, Page, Stat, StatGrid, fmtInr, fmtNum } from '@/components/layout/Page'
import { DailyEnergyChart, Legend, TodayOutputChart } from '@/components/charts/EnergyCharts'
import GridExchangeCard from '@/components/GridExchangeCard'
import AskButton from '@/components/assistant/AskButton'

export const metadata = { title: 'Overview' }

const BASIS_LABEL = { installed: 'installed system', preferred: 'preferred size', recommended: 'recommended size' }
const TARIFF_LABEL = { profile: 'from your profile', 'bill-history': 'from your bills', 'slab-model': 'marginal LT-I slab' }

export default async function DashboardPage() {
  const user = await requireUser()
  const o = await buildDashboardOverview(user.id)
  const { profile, sizing, today, basis, tariffInrPerKwh: tariff, calibration } = o

  const todayKwh = today.loggedKwh ?? today.modelledKwh
  const todayIsLogged = today.loggedKwh != null
  const place = o.location?.label ?? profile?.city ?? null

  return (
    <Page
      title="Overview"
      description={
        basis
          ? `${fmtNum(basis.capacityKw, 1)} kW ${BASIS_LABEL[basis.kind]}${place ? ` in ${place}` : ''}.`
          : 'Add your consumption to see modelled output and savings.'
      }
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href="/history">Log a reading</Link>
          </Button>
          <AskButton question="Summarise my solar performance and savings this month.">Ask about this</AskButton>
        </>
      }
    >
      {!sizing && !basis && (
        <Notice>
          Nothing here is estimated until it is based on your inputs. Add your monthly units in{' '}
          <Link href="/profile" className="text-primary underline underline-offset-2">
            Settings
          </Link>{' '}
          or record bills in the{' '}
          <Link href="/history" className="text-primary underline underline-offset-2">
            Energy log
          </Link>
          .
        </Notice>
      )}
      {basis && !o.weather.available && (
        <Notice tone="warning">
          Live weather is unavailable{o.weather.error ? ` (${o.weather.error})` : ''}. Modelled values are hidden rather
          than guessed.
        </Notice>
      )}

      <StatGrid>
        <Stat
          label="Output now"
          value={today.currentKw != null ? fmtNum(today.currentKw, 2) : '—'}
          unit="kW"
          note={
            basis ? (calibration ? 'Modelled, calibrated to your readings' : 'Modelled from live weather') : 'Needs a system size'
          }
        />
        <Stat
          label="Today"
          value={todayKwh != null ? fmtNum(todayKwh, 1) : '—'}
          unit="kWh"
          note={todayKwh == null ? 'No data yet' : todayIsLogged ? 'Logged reading' : 'Forecast for the full day'}
        />
        <Stat
          label="Saved this month"
          value={o.monthToDate?.savedInr != null ? fmtInr(o.monthToDate.savedInr) : '—'}
          tone={o.monthToDate?.savedInr ? 'positive' : undefined}
          note={
            o.monthToDate
              ? `${fmtNum(o.monthToDate.loggedKwh, 1)} kWh over ${o.monthToDate.days} logged day(s)`
              : 'Log readings to track savings'
          }
        />
        <Stat
          label="Tariff per kWh"
          value={tariff != null ? `₹${fmtNum(tariff, 2)}` : '—'}
          note={o.tariffSource ? TARIFF_LABEL[o.tariffSource] : 'Add a bill or monthly units'}
        />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Output today</CardTitle>
              <CardDescription>Hourly estimate from irradiance and temperature at your location.</CardDescription>
            </div>
            {today.modelledKwh != null && (
              <span className="num text-[13px] text-muted-foreground">{fmtNum(today.modelledKwh, 1)} kWh</span>
            )}
          </CardHeader>
          <CardContent>
            {today.hourly.length ? (
              <TodayOutputChart data={today.hourly} />
            ) : (
              <EmptyState title="No estimate yet">Set a system size or monthly units in Settings.</EmptyState>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
            <dl className="divide-y">
              {[
                ['System', basis ? `${fmtNum(basis.capacityKw, 1)} kW, ${BASIS_LABEL[basis.kind]}` : 'Not set'],
                ['Weather', o.weather.available ? 'Open-Meteo, hourly' : 'Unavailable'],
                ['Calibration', calibration ? `×${calibration.factor} from ${calibration.days} days` : 'Needs 7 logged days'],
                [
                  'Daily error',
                  calibration
                    ? `${fmtNum(calibration.mapeBeforePercent, 1)}% → ${fmtNum(calibration.mapeAfterPercent, 1)}%`
                    : '—',
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="num text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[12px] text-muted-foreground">
              The physics model is fitted to your logged days over the last 90 days (least squares on daily energy) and
              re-fitted with every new reading.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Last 30 days</CardTitle>
              <CardDescription>Your logged generation against the model for the same weather.</CardDescription>
            </div>
            <Legend
              items={[
                { label: 'Logged', color: 'var(--chart-2)' },
                { label: 'Modelled', color: 'var(--chart-1)', shape: 'line' },
              ]}
            />
          </CardHeader>
          <CardContent>
            {o.daily.length ? (
              <DailyEnergyChart data={o.daily} />
            ) : (
              <EmptyState title="No history yet">Log daily readings or connect a device to build this chart.</EmptyState>
            )}
          </CardContent>
        </Card>

        <GridExchangeCard grid={o.grid} billEstimate={o.billEstimate} loadCheck={o.loadCheck} />
      </div>

      {sizing && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recommendation</CardTitle>
              <CardDescription>
                Sized from {o.hasConsumptionData ? 'your billing history' : 'your profile'} at{' '}
                {fmtNum(o.stats.averageMonthlyConsumption ?? profile?.monthlyUnitsKwh ?? 0)} kWh a month.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/analysis">
                Open planner <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['Size', `${sizing.recommendedCapacityKw} kW`],
                ['Covers', `${sizing.coveragePercentage}% of use`],
                ['Net cost', fmtInr(sizing.netCostInr)],
                ['Subsidy', fmtInr(sizing.subsidyAmountInr)],
                ['Payback', `${sizing.paybackPeriodYears} yrs`],
              ].map(([k, v]) => (
                <div key={k} className="bg-card px-4 py-3">
                  <p className="eyebrow">{k}</p>
                  <p className="num mt-0.5 text-[17px]">{v}</p>
                </div>
              ))}
            </div>
            {!sizing.isRoofSufficient && (
              <p className="mt-3 text-[12px] text-warning">Roof area limits this to {sizing.maximumCapacityByRoofKw} kW.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rules in use</CardTitle>
            <Badge variant="outline">Sourced</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            <p>
              <span className="text-muted-foreground">Tariff: </span>
              {TARIFF_SOURCE.schedule}. Electricity duty, FSA and ToD are billed extra.
            </p>
            <p>
              <span className="text-muted-foreground">Year-end surplus: </span>
              paid at the average pooled power purchase cost, {NET_METERING_SETTLEMENT_SOURCE}.
            </p>
            <Link href="/knowledge" className="inline-flex items-center gap-1 text-primary hover:underline">
              Search the regulations <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common questions</CardTitle>
          </CardHeader>
          <ul className="divide-y border-t">
            {[
              'How much subsidy would I get for a 3 kW system?',
              'What is the TSSPDCL approval procedure for net metering?',
              'What is the difference between net and gross metering?',
            ].map((q) => (
              <li key={q}>
                <AskButton
                  question={q}
                  variant="ghost"
                  icon={false}
                  className="h-auto w-full justify-between rounded-none px-5 py-3 text-left font-normal whitespace-normal"
                >
                  <span>{q}</span>
                  <ArrowRight className="text-muted-foreground" />
                </AskButton>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  )
}
