'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fmtInr } from '@/components/layout/Page'
import type { QuoteExtract } from '@/lib/billing/documents'
import { checkQuote, type QuoteFields } from '@/lib/billing/quote'
import { overallStatus } from '@/lib/billing/reconcile'
import DocumentDrop from './DocumentDrop'
import ChecksList, { StatusPill } from './ChecksList'

type Draft = Record<keyof QuoteFields, string>

const NUM: { name: keyof QuoteFields; label: string }[] = [
  { name: 'capacityKw', label: 'System size (kW)' },
  { name: 'totalPriceInr', label: 'Quoted price (₹)' },
  { name: 'subsidyStatedInr', label: 'Subsidy stated (₹)' },
  { name: 'moduleCount', label: 'Number of panels' },
  { name: 'moduleWattage', label: 'Panel wattage (W)' },
  { name: 'inverterCapacityKw', label: 'Inverter size (kW)' },
  { name: 'performanceWarrantyYears', label: 'Performance warranty (years)' },
]
const TEXT: { name: keyof QuoteFields; label: string }[] = [
  { name: 'moduleBrand', label: 'Panel brand' },
  { name: 'inverterBrand', label: 'Inverter brand' },
]
const BOOL: { name: keyof QuoteFields; label: string; yes: string; no: string }[] = [
  { name: 'priceIsAfterSubsidy', label: 'Price is', yes: 'After subsidy', no: 'Before subsidy' },
  { name: 'dcrModules', label: 'DCR (Indian-made) panels', yes: 'Yes', no: 'No' },
  { name: 'includesNetMeter', label: 'Net meter included', yes: 'Yes', no: 'No' },
]

const empty = (): Draft =>
  Object.fromEntries([...NUM, ...TEXT, ...BOOL].map((f) => [f.name, ''])) as Draft

function fromExtract(q: QuoteExtract): Draft {
  const d = empty()
  for (const k of Object.keys(d) as (keyof QuoteFields)[]) {
    const v = q[k as keyof QuoteExtract]
    d[k] = v == null ? '' : String(v)
  }
  return d
}

function toFields(d: Draft): QuoteFields | null {
  const n = (v: string) => (v === '' ? null : Number(v))
  const b = (v: string) => (v === 'true' ? true : v === 'false' ? false : null)
  const capacity = n(d.capacityKw)
  const price = n(d.totalPriceInr)
  if (!capacity || !price) return null
  return {
    capacityKw: capacity,
    totalPriceInr: price,
    priceIsAfterSubsidy: b(d.priceIsAfterSubsidy),
    subsidyStatedInr: n(d.subsidyStatedInr),
    moduleBrand: d.moduleBrand || null,
    moduleWattage: n(d.moduleWattage),
    moduleCount: n(d.moduleCount),
    dcrModules: b(d.dcrModules),
    inverterBrand: d.inverterBrand || null,
    inverterCapacityKw: n(d.inverterCapacityKw),
    performanceWarrantyYears: n(d.performanceWarrantyYears),
    includesNetMeter: b(d.includesNetMeter),
  }
}

/** Checks run in the browser: the quote is never stored. */
export default function QuoteChecker({ sanctionedLoadKw, recommendedKw }: { sanctionedLoadKw: number | null; recommendedKw: number | null }) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [result, setResult] = useState<ReturnType<typeof checkQuote> | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!draft) {
    return (
      <div className="space-y-3">
        <DocumentDrop<QuoteExtract> kind="quote" label="Drop an installer quote here, or click to choose" onExtracted={(q) => setDraft(fromExtract(q))} />
        <button type="button" onClick={() => setDraft(empty())} className="text-[12.5px] text-primary hover:underline">
          Enter the quote manually instead
        </button>
      </div>
    )
  }

  const set = (k: keyof QuoteFields, v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  return (
    <div className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const fields = toFields(draft)
          if (!fields) return setError('System size and quoted price are required.')
          setError(null)
          setResult(checkQuote(fields, { sanctionedLoadKw, recommendedKw }))
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NUM.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`q-${f.name}`}>{f.label}</Label>
              <Input id={`q-${f.name}`} type="number" step="any" value={draft[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            </div>
          ))}
          {TEXT.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`q-${f.name}`}>{f.label}</Label>
              <Input id={`q-${f.name}`} value={draft[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            </div>
          ))}
          {BOOL.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`q-${f.name}`}>{f.label}</Label>
              <Select id={`q-${f.name}`} value={draft[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">Not stated</option>
                <option value="true">{f.yes}</option>
                <option value="false">{f.no}</option>
              </Select>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => (setDraft(null), setResult(null))} className="text-[12.5px] text-muted-foreground hover:text-foreground">
            Start over
          </button>
          <div className="flex items-center gap-3">
            {error && <p className="text-[12px] text-destructive">{error}</p>}
            <Button type="submit">Check quote</Button>
          </div>
        </div>
      </form>

      {result && (
        <div className="animate-in-up space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="num text-[13px]">
              {fmtInr(result.grossPriceInr)} before subsidy · {fmtInr(result.subsidyInr)} subsidy · {fmtInr(result.netPriceInr)} you pay ·{' '}
              {fmtInr(result.pricePerKwInr)}/kW
            </p>
            <StatusPill status={overallStatus(result.checks)} />
          </div>
          <ChecksList checks={result.checks} />
          <p className="text-[12px] text-muted-foreground">
            Confirm the panel model is on MNRE&apos;s ALMM list at{' '}
            <a href="https://almm.mnre.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              almm.mnre.gov.in
            </a>{' '}
            before signing.
          </p>
        </div>
      )}
    </div>
  )
}
