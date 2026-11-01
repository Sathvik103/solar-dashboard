'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveBillAction, type BillActionState } from '@/actions/bills'
import type { BillExtract } from '@/lib/billing/documents'
import { overallStatus } from '@/lib/billing/reconcile'
import DocumentDrop from './DocumentDrop'
import ChecksList, { StatusPill } from './ChecksList'

type Draft = Partial<Record<keyof BillExtract, string>> & { source: 'manual' | 'upload' }

const FIELDS: { name: keyof BillExtract; label: string; type?: string; group: 'Period' | 'Units' | 'Charges' }[] = [
  { name: 'billingPeriodStart', label: 'Period start', type: 'date', group: 'Period' },
  { name: 'billingPeriodEnd', label: 'Period end', type: 'date', group: 'Period' },
  { name: 'tariffCategory', label: 'Category', type: 'text', group: 'Period' },
  { name: 'importKwh', label: 'Imported (kWh)', group: 'Units' },
  { name: 'exportKwh', label: 'Exported (kWh)', group: 'Units' },
  { name: 'bankedOpeningKwh', label: 'Credit at start (kWh)', group: 'Units' },
  { name: 'bankedClosingKwh', label: 'Credit carried forward (kWh)', group: 'Units' },
  { name: 'billedUnits', label: 'Units billed', group: 'Units' },
  { name: 'energyCharge', label: 'Energy charge (₹)', group: 'Charges' },
  { name: 'fixedCharge', label: 'Fixed charge (₹)', group: 'Charges' },
  { name: 'electricityDuty', label: 'Electricity duty (₹)', group: 'Charges' },
  { name: 'fuelSurcharge', label: 'Fuel surcharge (₹)', group: 'Charges' },
  { name: 'otherCharges', label: 'Other charges (₹)', group: 'Charges' },
  { name: 'totalAmount', label: 'Total payable (₹)', group: 'Charges' },
]

function toDraft(fields: BillExtract): Draft {
  const d: Draft = { source: 'upload' }
  for (const f of FIELDS) {
    const v = fields[f.name]
    d[f.name] = v == null ? '' : String(v)
  }
  return d
}

export default function BillChecker() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [state, action, pending] = useActionState(saveBillAction, undefined as BillActionState | undefined)

  if (state?.checks && state.savedId) {
    const status = overallStatus(state.checks)
    return (
      <div className="animate-in-up space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Bill saved and checked</p>
          <StatusPill status={status} />
        </div>
        <ChecksList checks={state.checks} />
        <Button variant="outline" onClick={() => window.location.reload()}>
          Check another bill
        </Button>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="space-y-3">
        <DocumentDrop<BillExtract> kind="bill" label="Drop your electricity bill here, or click to choose" onExtracted={(f) => setDraft(toDraft(f))} />
        <button type="button" onClick={() => setDraft({ source: 'manual' })} className="text-[12.5px] text-primary hover:underline">
          Enter the values manually instead
        </button>
      </div>
    )
  }

  return (
    <form action={action} className="animate-in-up space-y-5">
      <input type="hidden" name="source" value={draft.source} />
      {draft.source === 'upload' && (
        <p className="rounded-md bg-accent/50 px-3 py-2 text-[12.5px]">
          Read from your bill. Check each value against the printed bill and correct anything that is wrong before saving.
        </p>
      )}
      {(['Period', 'Units', 'Charges'] as const).map((group) => (
        <fieldset key={group}>
          <legend className="eyebrow mb-2">{group}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS.filter((f) => f.group === group).map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? 'number'}
                  step={f.type ? undefined : '0.01'}
                  defaultValue={draft[f.name] ?? ''}
                  required={f.name === 'billingPeriodStart' || f.name === 'billingPeriodEnd' || f.name === 'totalAmount'}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <button type="button" onClick={() => setDraft(null)} className="text-[12.5px] text-muted-foreground hover:text-foreground">
          Start over
        </button>
        <div className="flex items-center gap-3">
          {state?.error && <p className="text-[12px] text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? 'Checking' : 'Save and check'}
          </Button>
        </div>
      </div>
    </form>
  )
}
