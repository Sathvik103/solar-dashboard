/**
 * artifacts.ts — charts and tables attached to assistant answers.
 *
 * Artifacts are built deterministically from tool outputs, never by the language model, so every
 * plotted number comes from the calculators or the user's own records.
 */
import { runSolarMLInference } from '@/lib/ml/inference'
import type { ToolExecutionRecord, UserIntent } from './types'

export type ChartArtifact = {
  type: 'chart'
  id: string
  title: string
  kind: 'bar' | 'line' | 'area'
  unit: string
  xKey: string
  series: { key: string; label: string }[]
  data: Record<string, string | number | null>[]
  note?: string
}

export type TableArtifact = {
  type: 'table'
  id: string
  title: string
  columns: string[]
  rows: (string | number)[][]
  note?: string
}

export type Artifact = ChartArtifact | TableArtifact

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

type Out = Record<string, unknown>
const out = (records: ToolExecutionRecord[], tool: string): Out | null => {
  const r = records.find((t) => t.tool === tool && t.success)
  return r && r.output && typeof r.output === 'object' ? (r.output as Out) : null
}

export function buildArtifacts(records: ToolExecutionRecord[]): Artifact[] {
  const artifacts: Artifact[] = []

  const compare = out(records, 'compareSystems')
  if (compare && Array.isArray(compare.comparisonTable)) {
    const rows = compare.comparisonTable as { capacityKw: number; netCostInr: number; monthlySavingsInr: number; paybackYears: number; subsidyInr: number }[]
    artifacts.push({
      type: 'chart',
      id: 'payback-by-size',
      title: 'Payback by system size',
      kind: 'bar',
      unit: 'years',
      xKey: 'size',
      series: [{ key: 'payback', label: 'Payback' }],
      data: rows.map((r) => ({ size: `${r.capacityKw} kW`, payback: r.paybackYears })),
    })
    artifacts.push({
      type: 'table',
      id: 'size-options',
      title: 'Size options',
      columns: ['Size', 'Subsidy', 'Net cost', 'Saving / month', 'Payback'],
      rows: rows.map((r) => [`${r.capacityKw} kW`, inr(r.subsidyInr), inr(r.netCostInr), inr(r.monthlySavingsInr), `${r.paybackYears} yrs`]),
    })
  }

  const plan = out(records, 'createSolarPlan')
  const output = out(records, 'calculateSolarOutput')
  const capacity =
    (plan?.proposalSummary as Out | undefined)?.recommendedSystemSizeKw ?? (output?.capacityKw as number | undefined)
  if (typeof capacity === 'number' && capacity > 0) {
    const curve = runSolarMLInference({ capacityKw: capacity, roofAreaSqft: capacity * 100 })
    artifacts.push({
      type: 'chart',
      id: 'monthly-generation',
      title: `Expected monthly generation, ${capacity} kW`,
      kind: 'bar',
      unit: 'kWh',
      xKey: 'month',
      series: [{ key: 'kwh', label: 'Generation' }],
      data: curve.monthlyCurve.map((m) => ({ month: m.month, kwh: m.monthlyKwh })),
      note: 'Reference Hyderabad climatology. The Planner uses measured climate for your city.',
    })
  }

  const cost = out(records, 'calculateSystemCost')
  if (cost && cost.costBreakdown) {
    const b = cost.costBreakdown as Out
    const s = cost.subsidyDetails as Out
    artifacts.push({
      type: 'table',
      id: 'cost-breakdown',
      title: `Cost for ${cost.capacityKw} kW`,
      columns: ['Item', 'Amount'],
      rows: [
        ['Modules and inverter', inr(Number(b.solarModulesAndInverterInr))],
        ['Structure and balance of system', inr(Number(b.mountingStructureAndBosInr))],
        ['Installation and commissioning', inr(Number(b.installationTestingCommissioningInr))],
        ...(Number(b.batteryStorageInr) > 0 ? [['Battery', inr(Number(b.batteryStorageInr))] as [string, string]] : []),
        ['PM Surya Ghar subsidy', `− ${inr(Number(s?.eligibleSubsidyInr ?? 0))}`],
        ['You pay', inr(Number(cost.netPayableCostInr))],
      ],
      note: 'Installed cost is a market estimate; get installer quotes.',
    })
  }

  const savings = out(records, 'calculateSavings')
  if (savings) {
    artifacts.push({
      type: 'chart',
      id: 'bill-before-after',
      title: 'Monthly bill before and after solar',
      kind: 'bar',
      unit: '₹',
      xKey: 'label',
      series: [{ key: 'amount', label: 'Bill' }],
      data: [
        { label: 'Today', amount: Number(savings.preSolarMonthlyBillInr) },
        { label: 'With solar', amount: Number(savings.postSolarMonthlyBillInr) },
      ],
      note: 'LT-I energy and fixed charges; excludes electricity duty and FSA.',
    })
  }

  const tariff = out(records, 'getTariffInformation')
  if (tariff && Array.isArray(tariff.slabBreakdown)) {
    const slabs = tariff.slabBreakdown as { slab: string; units: number; ratePerUnit: number; totalInr: number }[]
    artifacts.push({
      type: 'table',
      id: 'slab-breakdown',
      title: `Bill for ${tariff.monthlyUnitsKwh} units (${tariff.subcategory})`,
      columns: ['Slab', 'Units', 'Rate', 'Amount'],
      rows: slabs.map((s) => [s.slab, s.units, `₹${s.ratePerUnit.toFixed(2)}`, inr(s.totalInr)]),
    })
  }

  const energy = out(records, 'getEnergySummary')
  if (energy && Array.isArray(energy.daily) && (energy.daily as unknown[]).length > 1) {
    artifacts.push({
      type: 'chart',
      id: 'my-generation',
      title: 'Your generation, last 30 days',
      kind: 'bar',
      unit: 'kWh',
      xKey: 'date',
      series: [{ key: 'kwh', label: 'Generation' }],
      data: (energy.daily as { date: string; kwh: number }[]).map((d) => ({ date: d.date.slice(5), kwh: d.kwh })),
    })
  }

  const ledger = out(records, 'getNetMeteringLedger')
  if (ledger && Array.isArray(ledger.months) && (ledger.months as unknown[]).length > 1) {
    artifacts.push({
      type: 'chart',
      id: 'credit-balance',
      title: `Net-metering credit, ${ledger.year}`,
      kind: 'line',
      unit: 'kWh',
      xKey: 'month',
      series: [{ key: 'credit', label: 'Credit balance' }],
      data: (ledger.months as { month: string; creditAfterKwh: number }[]).map((m) => ({ month: m.month.slice(2), credit: m.creditAfterKwh })),
      note: 'Includes forecast months where marked in the Bills page.',
    })
  }

  return artifacts.slice(0, 3)
}

const SUGGESTIONS: Record<UserIntent, string[]> = {
  net_metering_credit: ['How should I use my banked units?', 'Check my latest bill', 'How is surplus export paid?'],
  full_solar_plan: ['Compare 3 kW and 5 kW for me', 'What documents do I need to apply?', 'How long until it pays back?'],
  compare_options: ['Which size has the fastest payback?', 'What would my bill be with the recommended size?', 'How much roof area do I need?'],
  financial_roi: ['Show my bill before and after solar', 'How is surplus export paid?', 'Compare system sizes for me'],
  system_sizing: ['Compare system sizes for me', 'How much subsidy would I get?', 'What would my bill be after solar?'],
  regulatory_inquiry: ['What is the TSSPDCL application process?', 'Can my system be larger than my sanctioned load?', 'How is surplus export paid?'],
  application_guide: ['What documents are required?', 'How long does approval take?', 'How much subsidy would I get?'],
  general_question: ['Which system size suits my consumption?', 'How much subsidy would I get for 3 kW?', 'How did my system perform this month?'],
  my_energy: ['How does this compare with the model?', 'How much did I save this month?', 'Is my system underperforming?'],
}

export function suggestionsFor(intent: string): string[] {
  return SUGGESTIONS[intent as keyof typeof SUGGESTIONS] ?? SUGGESTIONS.general_question
}
