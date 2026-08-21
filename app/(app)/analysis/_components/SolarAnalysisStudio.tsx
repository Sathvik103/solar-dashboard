'use client'

import { useState, useMemo } from 'react'
import {
  Sun,
  Zap,
  IndianRupee,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { calculateOptimalSystemSize } from '@/lib/calculations/systemSizing'
import { calculate25YearSavings } from '@/lib/calculations/financial'
import { runSolarMLInference } from '@/lib/ml/inference'
import Link from 'next/link'

export default function SolarAnalysisStudio({ initialProfile }: { initialProfile?: any }) {
  const [monthlyUnits, setMonthlyUnits] = useState(
    initialProfile?.monthlyUnitsKwh ?? initialProfile?.monthly_units_kwh ?? 350
  )
  const [monthlyBill, setMonthlyBill] = useState(
    initialProfile?.monthlyBillInr ?? initialProfile?.monthly_bill_inr ?? 2800
  )
  const [roofArea, setRoofArea] = useState(
    initialProfile?.roofAreaSqft ?? initialProfile?.roof_area_sqft ?? 800
  )
  const [shading, setShading] = useState<'none' | 'partial' | 'heavy'>(
    (initialProfile?.shadingLevel || initialProfile?.shading_level || 'none') as any
  )
  const [orientation, setOrientation] = useState<'south' | 'east' | 'west'>('south')

  // Calculate Deterministic Sizing & Economics
  const sizing = useMemo(() => {
    return calculateOptimalSystemSize({
      monthlyUnitsKwh: monthlyUnits,
      monthlyBillInr: monthlyBill,
      roofAreaSqft: roofArea,
      shadingLevel: shading,
    })
  }, [monthlyUnits, monthlyBill, roofArea, shading])

  // Run ML 12-Month Generation Inference
  const mlInference = useMemo(() => {
    return runSolarMLInference({
      capacityKw: sizing.recommendedCapacityKw,
      roofAreaSqft: roofArea,
      orientation,
      shadingLevel: shading,
    })
  }, [sizing.recommendedCapacityKw, roofArea, orientation, shading])

  // 25-Year Financial Cashflow Projection
  const financialCashflows = useMemo(() => {
    return calculate25YearSavings({
      initialInvestment: sizing.netCostInr,
      annualSavings: sizing.estimatedAnnualSavingsInr,
      degradationRate: 0.005,
      tariffEscalationRate: 0.03,
      years: 20,
    })
  }, [sizing.netCostInr, sizing.estimatedAnnualSavingsInr])

  return (
    <div className="space-y-8">
      {/* Studio Configuration Bar */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-background to-amber-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-600" />
                <span>Interactive Solar Studio & Proposal Sizing</span>
              </CardTitle>
              <CardDescription>
                Live simulation engine combining deterministic sizing, TSSPDCL tariffs, PM Surya Ghar subsidies, and regional ML insolation models.
              </CardDescription>
            </div>
            <Badge className="bg-emerald-600 font-mono text-xs">
              Deccan Climate v1.2
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Monthly Consumption (kWh)</Label>
              <Input
                type="number"
                min={50}
                max={2500}
                value={monthlyUnits}
                onChange={(e) => setMonthlyUnits(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Monthly Bill (₹)</Label>
              <Input
                type="number"
                min={200}
                max={50000}
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Available Roof Area (sq.ft)</Label>
              <Input
                type="number"
                min={100}
                max={10000}
                value={roofArea}
                onChange={(e) => setRoofArea(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Roof Shading Condition</Label>
              <select
                className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                value={shading}
                onChange={(e) => setShading(e.target.value as any)}
              >
                <option value="none">Zero Shadow (Full Sun)</option>
                <option value="partial">Partial Shading (~15% loss)</option>
                <option value="heavy">Heavy Shading (~30% loss)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Recommended System</span>
              <div className="text-2xl font-black text-foreground">
                {sizing.recommendedCapacityKw} <span className="text-sm font-normal text-muted-foreground">kW</span>
              </div>
              <span className="text-xs text-emerald-600 font-medium">
                Offsets ~{sizing.coveragePercentage}% of bill
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Sun className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-500/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Net Investment</span>
              <div className="text-2xl font-black text-foreground">
                ₹{sizing.netCostInr.toLocaleString()}
              </div>
              <span className="text-xs text-amber-600 font-medium">
                Includes ₹{sizing.subsidyAmountInr.toLocaleString()} PM Surya Ghar Subsidy
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Estimated Annual Savings</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{sizing.estimatedAnnualSavingsInr.toLocaleString()}
              </div>
              <span className="text-xs text-muted-foreground">
                ~₹{sizing.estimatedMonthlySavingsInr.toLocaleString()} / month
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Payback Period</span>
              <div className="text-2xl font-black text-foreground">
                {sizing.paybackPeriodYears} <span className="text-sm font-normal text-muted-foreground">years</span>
              </div>
              <span className="text-xs text-emerald-600 font-medium">
                25-Yr Net Profit: ₹{financialCashflows.netProfit.toLocaleString()}
              </span>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Zap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML 12-Month Generation Curve */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>ML Predicted Monthly Generation Curve</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Predicted monthly energy yield (kWh) accounting for seasonal cloud cover and monsoon dips.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Annual: {mlInference.predictedAnnualKwh} kWh
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mlInference.monthlyCurve}>
                  <defs>
                    <linearGradient id="solarYieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis unit=" kWh" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="monthlyKwh"
                    name="Predicted Generation"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#solarYieldGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
              <span>Peak Month: <strong className="text-foreground">{mlInference.peakProductionMonth}</strong></span>
              <span>Monsoon Low: <strong className="text-foreground">{mlInference.lowestProductionMonth}</strong></span>
              <span>Capacity Utilization: <strong className="text-foreground">{mlInference.capacityUtilizationFactorPercent}%</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* 20-Year Cumulative Cashflow Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>20-Year Net Financial Return</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Cumulative savings considering 0.5% module degradation & 3% annual tariff escalation.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono text-emerald-600">
                ROI: {sizing.paybackPeriodYears} yrs
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialCashflows.cashflows.filter((_, idx) => idx % 2 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => `₹${Number(val).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="cumulativeSavingsInr" name="Cumulative Savings" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netCashflowInr" name="Net Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
              <span>Lifetime Savings: <strong className="text-foreground">₹{financialCashflows.totalSavings.toLocaleString()}</strong></span>
              <span>Net Profit: <strong className="text-foreground">₹{financialCashflows.netProfit.toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Capacity Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            <span>Capacity Options Comparison (Telangana Benchmarks)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Standard residential system configurations compared against your monthly usage ({monthlyUnits} kWh).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2.5 px-3">System Size</th>
                  <th className="text-left py-2.5 px-3">Monthly Yield</th>
                  <th className="text-left py-2.5 px-3">Gross Cost</th>
                  <th className="text-left py-2.5 px-3">Govt Subsidy</th>
                  <th className="text-left py-2.5 px-3">Net Cost</th>
                  <th className="text-left py-2.5 px-3">Monthly Savings</th>
                  <th className="text-left py-2.5 px-3">Payback</th>
                  <th className="text-right py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sizing.comparisonOptions.map((opt) => {
                  const isRec = opt.capacityKw === sizing.recommendedCapacityKw
                  return (
                    <tr key={opt.capacityKw} className={`hover:bg-muted/40 ${isRec ? 'bg-emerald-500/5 font-semibold' : ''}`}>
                      <td className="py-3 px-3 flex items-center gap-2">
                        <span>{opt.capacityKw} kW</span>
                        {isRec && <Badge className="text-[10px] h-4 bg-emerald-600">Recommended</Badge>}
                      </td>
                      <td className="py-3 px-3">{opt.monthlyGenKwh} kWh</td>
                      <td className="py-3 px-3">₹{opt.grossCostInr.toLocaleString()}</td>
                      <td className="py-3 px-3 text-emerald-600 font-medium">₹{opt.subsidyInr.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold">₹{opt.netCostInr.toLocaleString()}</td>
                      <td className="py-3 px-3">₹{opt.monthlySavingsInr.toLocaleString()}</td>
                      <td className="py-3 px-3">{opt.paybackYears} yrs</td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/chat?q=Why+is+the+${opt.capacityKw}kW+system+suitable+for+me`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                            <span>Ask Agent</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Environmental & Regulatory Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <span>Environmental & Carbon Impact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-muted-foreground">Annual CO2 Reduction</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {sizing.annualCo2AvoidedKg.toLocaleString()} kg
                </div>
                <span className="text-[11px] text-muted-foreground">~{(sizing.annualCo2AvoidedKg / 1000).toFixed(1)} tonnes/year</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-muted-foreground">Equivalent Trees Planted</span>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  {sizing.treesEquivalentPlanted} trees
                </div>
                <span className="text-[11px] text-muted-foreground">Lifetime CO2 offset equivalent</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Replacing coal-heavy grid electricity with clean solar power from your rooftop significantly offsets greenhouse gas emissions and qualifies for green building credits in Telangana.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>Telangana Feasibility & DISCOM Checklist</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Roof Area Compliance:</strong> {sizing.requiredRoofAreaSqft} sq.ft required out of {roofArea} sq.ft ({sizing.isRoofSufficient ? 'Sufficient' : 'Tight roof space'}).
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">TGERC Net-metering:</strong> Eligible under Regulation 1 of 2016 (Residential ≤ 1000 kW).
              </div>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">PM Surya Ghar Subsidy:</strong> Direct Benefit Transfer of ₹{sizing.subsidyAmountInr.toLocaleString()} into bank account within 30 days of commissioning.
              </div>
            </div>

            <div className="pt-2">
              <Link href={`/chat?q=How+do+I+apply+for+a+${sizing.recommendedCapacityKw}kW+system+in+Hyderabad`}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Detailed Implementation Roadmap with Agent</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
