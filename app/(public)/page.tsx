import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sun,
  Sparkles,
  Sliders,
  ShieldCheck,
  Cpu,
  BookOpen,
  ArrowRight,
  } from 'lucide-react'

export const metadata = {
  title: 'Solar Intelligence Platform — Telangana Rooftop Solar Planning',
  description: 'AI-powered rooftop solar planning grounded in Telangana official regulations, incentives, and deterministic calculations.',
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground block leading-tight">
                SolarIntel
              </span>
              <span className="text-[10px] text-emerald-600 font-medium tracking-wider uppercase block">
                Telangana Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <Badge variant="outline" className="px-3 py-1 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
          📍 Hyderabad & Telangana Solar Intelligence
        </Badge>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Understand your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700">
            solar potential
          </span>
          .
        </h1>

        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          AI-powered solar planning grounded in Telangana&apos;s official regulations, TSSPDCL net-metering rules, PM Surya Ghar subsidies, and deterministic calculations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/analysis">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold">
              <Sliders className="h-4 w-4" />
              <span>Analyze My Solar Potential</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/chat">
            <Button size="lg" variant="outline" className="gap-2 font-semibold border-amber-500/30 hover:bg-amber-500/5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Ask the Solar Agent</span>
            </Button>
          </Link>
        </div>

        {/* Value Prop Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Zero Hallucination Grounding</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-emerald-600" />
            <span>Deterministic Math & ML</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>Official TGERC & MNRE Sources</span>
          </div>
        </div>
      </section>

      {/* Feature Pillar Cards */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">Grounded Knowledge Retrieval</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every regulatory claim is retrieved with pgvector from authoritative TGERC rules, TGREDCO guidelines, and PM Surya Ghar policy documents with direct source citations.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-500/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">Deterministic Calculations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Financial ROI, monthly electricity bill savings, payback years, and 25-year NPV are computed with deterministic physics formulas, not LLM arithmetic.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base">Autonomous Agentic Reasoning</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Interactive AI advisor with structured execution traces, live tool invocation, automated verifications, and custom solar profile personalization.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Regional Focus Banner */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="p-8 rounded-2xl bg-card border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Ready to size your rooftop system?</h3>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              Enter your monthly electricity usage and roof area in Hyderabad to receive an instant system recommendation, subsidy credit breakdown, and 25-year projection.
            </p>
          </div>
          <Link href="/analysis">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              Start Free Sizing Analysis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-6 text-center text-xs text-muted-foreground">
        <p>Solar Intelligence Platform • Built for Telangana & Hyderabad Homeowners • Powered by Next.js 16, Supabase, pgvector & Gemini</p>
      </footer>
    </div>
  )
}
