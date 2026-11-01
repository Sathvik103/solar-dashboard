'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Notice, Stat, StatGrid, fmtInr, fmtNum } from '@/components/layout/Page'
import AskButton from '@/components/assistant/AskButton'
import { calculateOptimalSystemSize, monthlyBillSavingInr, SOLAR_COST_PER_KW_INR } from '@/lib/calculations/systemSizing'
import { calculate25YearSavings, calculatePMSuryaGharSubsidy } from '@/lib/calculations/financial'
import { runSolarMLInference } from '@/lib/ml/inference'
import type { MonthlyClimateInput } from '@/lib/ml/features'
import { panelTypes } from '@/lib/data/panels'
import type { SolarProfile } from '@/lib/types/user'
import { cn } from '@/lib/utils'

type Shading = 'none' | 'partial' | 'heavy'
type Orientation = 'south' | 'south-east' | 'south-west' | 'east' | 'west'

function toShading(level?: string | null): Shading {
  if (level === 'heavy' || level === 'high') return 'heavy'
  if (level === 'partial' || level === 'medium' || level === 'low') return 'partial'
  return 'none'
}

function toOrientation(o?: string | null): Orientation {
  return o === 'south-east' || o === 'south-west' || o === 'east' || o === 'west' ? o : 'south'
}

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-plex-mono)' }
const TOOLTIP = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--foreground)', fontWeight: 500 },
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value))))}
          className={suffix ? 'pr-12' : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export default function SolarAnalysisStudio({ initialProfile }: { initialProfile?: SolarProfile | null }) {
  const usingExampleInputs = initialProfile?.monthlyUnitsKwh == null
  const [monthlyUnits, setMonthlyUnits] = useState(initialProfile?.monthlyUnitsKwh ?? 350)
  const [roofArea, setRoofArea] = useState(initialProfile?.roofAreaSqft ?? 800)
  const [shading, setShading] = useState<Shading>(toShading(initialProfile?.shadingLevel))
  const [orientation, setOrientation] = useState<Orientation>(toOrientation(initialProfile?.roofOrientation))
  const [capacityOverride, setCapacityOverride] = useState<number | null>(initialProfile?.preferredCapacityKw ?? null)
  const [escalation, setEscalation] = useState(3)
  const [climate, setClimate] = useState<{ place: string; monthly: MonthlyClimateInput[] } | null>(null)
  const [climateState, setClimateState] = useState<'loading' | 'measured' | 'reference'>('loading')

  // Measured local climatology; the built-in reference table is used only if this fails.
  useEffect(() => {
    let cancelled = false
    fetch('/api/climate')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        if (d?.monthly?.length === 12) {
          setClimate({ place: d.place, monthly: d.monthly })
          setClimateState('measured')
        } else setClimateState('reference')
      })
      .catch(() => !cancelled && setClimateState('reference'))
    return () => {
      cancelled = true
    }
  }, [])

  const sizing = useMemo(
    () => calculateOptimalSystemSize({ monthlyUnitsKwh: monthlyUnits, roofAreaSqft: roofArea, shadingLevel: shading }),
    [monthlyUnits, roofArea, shading]
  )
  const capacityKw = capacityOverride && capacityOverride > 0 ? capacityOverride : sizing.recommendedCapacityKw

  const yieldCurve = useMemo(
    () =>
      runSolarMLInference({
        capacityKw,
        roofAreaSqft: roofArea,
        orientation,
        shadingLevel: shading,
        climate: climate?.monthly,
      }),
    [capacityKw, roofArea, orientation, shading, climate]
  )

  // Savings month by month against the slab ladder, using the climate-driven yield.
  const economics = useMemo(() => {
    const monthly = yieldCurve.monthlyCurve.map((m) => ({
      month: m.month,
      generation: m.monthlyKwh,
      saving: monthlyBillSavingInr(monthlyUnits, m.monthlyKwh),
    }))
    const annualSavings = monthly.reduce((a, m) => a + m.saving, 0)
    const gross = Math.round(capacityKw * SOLAR_COST_PER_KW_INR)
    const subsidy = calculatePMSuryaGharSubsidy(capacityKw)
    const net = Math.max(0, gross - subsidy)
    const projection = calculate25YearSavings({
      initialInvestment: net,
      annualSavings,
      degradationRate: 0.005,
      tariffEscalationRate: escalation / 100,
      years: 25,
    })
    const paybackYear = projection.cashflows.find((c) => c.netCashflowInr >= 0)?.year ?? null
    const coverage = Math.min(100, Math.round((yieldCurve.predictedAnnualKwh / (monthlyUnits * 12)) * 100))
    return { monthly, annualSavings, gross, subsidy, net, projection, paybackYear, coverage }
  }, [yieldCurve, monthlyUnits, capacityKw, escalation])

  const options = useMemo(
    () =>
      [2, 3, 4, 5, 7, 10].map((kw) => {
        const curve = runSolarMLInference({
          capacityKw: kw,
          roofAreaSqft: roofArea,
          orientation,
          shadingLevel: shading,
          climate: climate?.monthly,
        })
        const annual = curve.monthlyCurve.reduce((a, m) => a + monthlyBillSavingInr(monthlyUnits, m.monthlyKwh), 0)
        const net = Math.max(0, kw * SOLAR_COST_PER_KW_INR - calculatePMSuryaGharSubsidy(kw))
        return {
          kw,
          annualKwh: curve.predictedAnnualKwh,
          net,
          subsidy: calculatePMSuryaGharSubsidy(kw),
          annual,
          payback: annual > 0 ? net / annual : null,
          fits: kw * 90 <= roofArea,
        }
      }),
    [roofArea, orientation, shading, climate, monthlyUnits]
  )

  const cashflowRows = economics.projection.cashflows.map((c) => ({
    year: c.year,
    cumulative: c.cumulativeSavingsInr,
    investment: economics.net,
  }))
  const sanctioned = initialProfile?.sanctionedLoadKw ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <div>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Starts from your profile. Changes here are not saved.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField id="units" label="Monthly consumption" value={monthlyUnits} onChange={setMonthlyUnits} min={20} max={5000} suffix="kWh" />
          <NumberField id="roof" label="Shade-free roof area" value={roofArea} onChange={setRoofArea} min={50} max={10000} suffix="sq ft" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shading">Shading</Label>
            <Select id="shading" value={shading} onChange={(e) => setShading(e.target.value as Shading)}>
              <option value="none">None</option>
              <option value="partial">Partial, about 15% loss</option>
              <option value="heavy">Heavy, about 30% loss</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orientation">Roof faces</Label>
            <Select id="orientation" value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
              <option value="south">South</option>
              <option value="south-east">South-east</option>
              <option value="south-west">South-west</option>
              <option value="east">East</option>
              <option value="west">West</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">System size</Label>
            <Select
              id="capacity"
              value={capacityOverride ?? ''}
              onChange={(e) => setCapacityOverride(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Recommended ({sizing.recommendedCapacityKw} kW)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((kw) => (
                <option key={kw} value={kw}>
                  {kw} kW
                </option>
              ))}
            </Select>
          </div>
          <NumberField id="esc" label="Tariff growth per year" value={escalation} onChange={setEscalation} min={0} max={10} step={0.5} suffix="%" />
          <p className="border-t pt-3 text-[12px] text-muted-foreground">
            Climate:{' '}
            {climateState === 'loading'
              ? 'loading'
              : climateState === 'measured'
                ? `measured 10-year mean, ${climate?.place}`
                : 'reference table (live data unavailable)'}
            . Installed cost ₹{fmtNum(SOLAR_COST_PER_KW_INR)}/kW is a market estimate.
          </p>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-6">
        {usingExampleInputs && (
          <Notice>
            These are example inputs because your profile has no consumption yet.{' '}
            <Link href="/profile" className="text-primary underline underline-offset-2">
              Add your details
            </Link>{' '}
            for a personal proposal.
          </Notice>
        )}

        <StatGrid>
          <Stat label="System" value={fmtNum(capacityKw, 1)} unit="kW" note={`Covers ${economics.coverage}% of annual use`} />
          <Stat label="Net cost" value={fmtInr(economics.net)} note={`After ${fmtInr(economics.subsidy)} subsidy`} />
          <Stat label="First-year saving" value={fmtInr(economics.annualSavings)} tone="positive" note={`${fmtInr(economics.annualSavings / 12)} a month on average`} />
          <Stat
            label="Payback"
            value={economics.paybackYear != null ? economics.paybackYear : '—'}
            unit={economics.paybackYear != null ? 'years' : undefined}
            note={`25-year net ${fmtInr(economics.projection.netProfit)}`}
          />
        </StatGrid>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Monthly generation</CardTitle>
                <CardDescription>Monsoon months produce least; spring the most.</CardDescription>
              </div>
              <span className="num text-[13px] text-muted-foreground">{fmtNum(yieldCurve.predictedAnnualKwh)} kWh/yr</span>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={economics.monthly} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
                    <ReferenceLine y={monthlyUnits} stroke="var(--chart-2)" strokeDasharray="4 3" />
                    <Tooltip {...TOOLTIP} cursor={{ fill: 'var(--muted)' }} formatter={(v) => [`${v} kWh`, 'Generation']} />
                    <Bar dataKey="generation" fill="var(--chart-1)" radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Dashed line: your monthly consumption. Capacity factor {yieldCurve.capacityUtilizationFactorPercent}%.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>25-year cumulative savings</CardTitle>
                <CardDescription>0.5% yearly module degradation, {escalation}% tariff growth.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashflowRows} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={AXIS}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${Math.round(v / 1000)}k`)}
                    />
                    <Tooltip {...TOOLTIP} labelFormatter={(y) => `Year ${y}`} formatter={(v) => fmtInr(Number(v))} />
                    <Line dataKey="cumulative" name="Cumulative savings" stroke="var(--chart-1)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                    <Line dataKey="investment" name="Net cost" stroke="var(--chart-2)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Lifetime savings {fmtInr(economics.projection.totalSavings)}; break-even where the lines cross.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Size options</CardTitle>
              <CardDescription>Each size modelled with your climate, roof and consumption.</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Generation / yr</TableHead>
                <TableHead className="text-right">Subsidy</TableHead>
                <TableHead className="text-right">Net cost</TableHead>
                <TableHead className="text-right">Saving / yr</TableHead>
                <TableHead className="text-right">Payback</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map((o) => (
                <TableRow key={o.kw} className={cn(o.kw === capacityKw && 'bg-accent/50')}>
                  <TableCell className="num">
                    {o.kw} kW
                    {o.kw === sizing.recommendedCapacityKw && <Badge className="ml-2">Recommended</Badge>}
                    {!o.fits && (
                      <Badge variant="warning" className="ml-2">
                        Roof too small
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="num text-right">{fmtNum(o.annualKwh)} kWh</TableCell>
                  <TableCell className="num text-right">{fmtInr(o.subsidy)}</TableCell>
                  <TableCell className="num text-right">{fmtInr(o.net)}</TableCell>
                  <TableCell className="num text-right">{fmtInr(o.annual)}</TableCell>
                  <TableCell className="num text-right">{o.payback != null ? `${fmtNum(o.payback, 1)} yrs` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <AskButton
                      question={`Is a ${o.kw} kW system right for me at ${monthlyUnits} kWh a month?`}
                      variant="ghost"
                      size="xs"
                      icon={false}
                    >
                      Ask
                    </AskButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Panel technology</CardTitle>
                <CardDescription>Modules needed for {fmtNum(capacityKw, 1)} kW. Prices are typical retail.</CardDescription>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Panels</TableHead>
                  <TableHead className="text-right">Area</TableHead>
                  <TableHead className="text-right">Degradation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panelTypes.map((p) => {
                  const count = Math.ceil((capacityKw * 1000) / p.wattage)
                  const areaSqft = Math.round(((count * p.wattage) / (p.efficiency * 1000)) * 10.764)
                  return (
                    <TableRow key={p.name}>
                      <TableCell>
                        {p.name}
                        <span className="num ml-1.5 text-[12px] text-muted-foreground">{p.wattage} W</span>
                      </TableCell>
                      <TableCell className="num text-right">{count}</TableCell>
                      <TableCell className={cn('num text-right', areaSqft > roofArea && 'text-warning')}>{fmtNum(areaSqft)} sq ft</TableCell>
                      <TableCell className="num text-right">{fmtNum(p.degradationRate * 100, 1)}%/yr</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feasibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-[13px]">
                {[
                  {
                    ok: capacityKw * 90 <= roofArea,
                    label: 'Roof area',
                    detail: `${fmtNum(capacityKw * 90)} of ${fmtNum(roofArea)} sq ft needed`,
                  },
                  {
                    ok: sanctioned == null ? null : capacityKw <= sanctioned,
                    label: 'Sanctioned load',
                    detail:
                      sanctioned == null
                        ? 'Add it in Settings to check'
                        : capacityKw <= sanctioned
                          ? `Within ${fmtNum(sanctioned, 1)} kW`
                          : `Above ${fmtNum(sanctioned, 1)} kW; apply for load enhancement`,
                  },
                  {
                    ok: true,
                    label: 'PM Surya Ghar',
                    detail: `${fmtInr(economics.subsidy)} for ${fmtNum(capacityKw, 1)} kW, paid after commissioning`,
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          'size-2 rounded-[2px]',
                          row.ok == null ? 'bg-muted-foreground/40' : row.ok ? 'bg-positive' : 'bg-warning'
                        )}
                      />
                      {row.label}
                    </span>
                    <span className="text-right text-muted-foreground">{row.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <AskButton question={`What are the steps to install a ${fmtNum(capacityKw, 1)} kW rooftop system with TSSPDCL net metering?`}>
                  Ask for the application steps
                </AskButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
