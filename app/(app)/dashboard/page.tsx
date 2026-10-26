import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import OutputChart from '@/components/charts/OutputChart'
import { AnimatedCard, AnimatedContainer } from '@/components/AnimatedCard'
import PageWrapper from '@/components/layout/PageWrapper'
import { requireUser } from '@/lib/dal/users'
import { buildDashboardOverview } from '@/lib/dashboard/overview'
import Link from 'next/link'
import {
  Sun,
  Zap,
  IndianRupee,
  Leaf,
  Sparkles,
  Sliders,
  ArrowRight,
  BookOpen,
  } from 'lucide-react'

export default async function DashboardPage() {
  const user = await requireUser()
  const overview = await buildDashboardOverview(user.id)
  const { profile, sizing, today, basis, tariffInrPerKwh } = overview
  const monthlyUnits = overview.stats.averageMonthlyConsumption ?? profile?.monthlyUnitsKwh ?? null
  const measured = today.loggedKwh
  const todayKwh = measured ?? today.modelledKwh
  const todaySaved = todayKwh != null && tariffInrPerKwh != null ? todayKwh * tariffInrPerKwh : null
  const estimateTag = measured == null ? 'Modelled estimate' : 'Logged reading'

  return (
    <PageWrapper>
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Solar Intelligence Dashboard</span>
            <Badge className="bg-emerald-600 font-mono text-xs">
              {profile?.city || 'Set location'}{profile?.state ? `, ${profile.state}` : ''}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Output modelled from live weather for your system, plus the readings and bills you log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/analysis">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
              <Sliders className="h-3.5 w-3.5 text-emerald-600" />
              <span>Solar Studio</span>
            </Button>
          </Link>
          <Link href="/chat">
            <Button size="sm" className="text-xs gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Ask Solar Agent</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Recommendation / onboarding */}
      {sizing ? (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-transparent">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground">
                    Recommendation: {sizing.recommendedCapacityKw} kW System
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    PM Surya Ghar Subsidy: ₹{sizing.subsidyAmountInr.toLocaleString('en-IN')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on your {monthlyUnits} kWh/month {overview.hasConsumptionData ? 'billing history' : 'profile'}, this saves ~₹
                  {sizing.estimatedAnnualSavingsInr.toLocaleString('en-IN')}/yr with a payback of {sizing.paybackPeriodYears} years.
                </p>
              </div>
            </div>
            <Link href="/analysis">
              <Button size="sm" variant="secondary" className="text-xs gap-1 shrink-0 h-8 font-medium">
                <span>View Full Proposal</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-sm">Add your data to get started</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter your monthly units in your solar profile or add electricity bills. Nothing on this page is
                shown until it is based on your real inputs.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/profile"><Button size="sm" variant="secondary" className="text-xs h-8">Solar profile</Button></Link>
              <Link href="/history"><Button size="sm" className="text-xs h-8">Add bills</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {!overview.weather.available && basis && (
        <p role="alert" className="text-xs text-amber-600">
          Live weather is unavailable right now{overview.weather.error ? ` (${overview.weather.error})` : ''}; modelled output is hidden rather than guessed.
        </p>
      )}

      {/* Primary KPI Metrics */}
      <AnimatedContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard>
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Estimated Power Now</span>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {today.currentKw != null ? today.currentKw.toFixed(2) : '—'} <span className="text-sm font-normal text-muted-foreground">kW</span>
              </div>
              <span className="text-xs text-emerald-600 font-medium mt-1 block">
                {basis ? `Modelled · ${basis.capacityKw} kW (${basis.kind})` : "Needs system size"}
              </span>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard>
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Today&apos;s Generation</span>
                <Sun className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {todayKwh != null ? todayKwh.toFixed(2) : '—'} <span className="text-sm font-normal text-muted-foreground">kWh</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">
                {todayKwh != null ? estimateTag : 'No data yet'}
              </span>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard>
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Money Saved Today</span>
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{todaySaved != null ? todaySaved.toFixed(2) : '—'}
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">
                {tariffInrPerKwh != null ? `@ ₹${tariffInrPerKwh}/kWh` : 'Add a bill for tariff'}
              </span>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard>
          <Card className="hover:border-emerald-500/40 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Projected CO₂ avoided / yr</span>
                <Leaf className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {sizing ? sizing.annualCo2AvoidedKg.toLocaleString('en-IN') : '—'} <span className="text-sm font-normal text-muted-foreground">kg CO2</span>
              </div>
              <span className="text-xs text-emerald-600 font-medium mt-1 block">
                {sizing ? `≈ ${sizing.treesEquivalentPlanted} trees (0.82 kg/kWh grid factor)` : 'Needs consumption data'}
              </span>
            </CardContent>
          </Card>
        </AnimatedCard>
      </AnimatedContainer>

      {/* Telemetry Chart & Grid Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OutputChart data={today.hourly} />
        </div>

        <div className="space-y-4">
          {/* Quick Knowledge Highlights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <span>Telangana Solar Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                <span className="font-semibold text-foreground">TGERC Net-Metering:</span>
                <p className="text-muted-foreground">
                  Allowed up to 100% of sanctioned load, capped at 1000 kW per consumer connection.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                <span className="font-semibold text-foreground">Annual Settlement:</span>
                <p className="text-muted-foreground">
                  Unused energy credits are settled every financial year on March 31st at the average pooled power cost.
                </p>
              </div>

              <Link href="/knowledge">
                <Button variant="ghost" size="sm" className="w-full text-xs gap-1 mt-1">
                  <span>Open Knowledge Bench</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Agent Query Box */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Instant Consultation Questions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              <Link
                href="/chat?q=How+much+subsidy+do+I+get+for+a+3kW+system+in+Hyderabad"
                className="block p-2 rounded hover:bg-background/80 transition-colors text-foreground font-medium"
              >
                → How much subsidy for 3 kW in Hyderabad?
              </Link>
              <Link
                href="/chat?q=What+is+the+step-by-step+TSSPDCL+approval+procedure"
                className="block p-2 rounded hover:bg-background/80 transition-colors text-foreground font-medium"
              >
                → What is the TSSPDCL approval procedure?
              </Link>
              <Link
                href="/chat?q=What+is+the+difference+between+net+metering+and+gross+metering"
                className="block p-2 rounded hover:bg-background/80 transition-colors text-foreground font-medium"
              >
                → What is net vs gross metering?
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
