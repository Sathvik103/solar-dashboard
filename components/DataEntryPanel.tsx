'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  importCsvAction,
  logConsumptionAction,
  logGenerationAction,
  type EnergyActionState,
} from '@/actions/energy'

function Feedback({ state }: { state: EnergyActionState | undefined }) {
  if (!state) return null
  return (
    <div role="status" className="space-y-0.5 text-[12px]">
      {state.success && <p className="text-positive">{state.success}</p>}
      {state.error && <p className="text-destructive">{state.error}</p>}
      {state.rowErrors?.map((e) => (
        <p key={e.line} className="text-destructive">
          Line {e.line}: {e.message}
        </p>
      ))}
    </div>
  )
}

function Field({
  id,
  label,
  hint,
  className,
  ...props
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} />
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

const TABS = [
  { id: 'reading', label: 'Daily reading' },
  { id: 'bill', label: 'Monthly bill' },
  { id: 'csv', label: 'Import CSV' },
] as const

export default function DataEntryPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('reading')
  const [gen, genAction, genPending] = useActionState(logGenerationAction, undefined as EnergyActionState | undefined)
  const [bill, billAction, billPending] = useActionState(logConsumptionAction, undefined as EnergyActionState | undefined)
  const [csv, csvAction, csvPending] = useActionState(importCsvAction, undefined as EnergyActionState | undefined)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Card>
      <div role="tablist" aria-label="Add data" className="flex gap-1 border-b px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-2.5 py-3 text-[13px] transition-colors',
              tab === t.id
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'reading' && (
          <form action={genAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field id="recordDate" label="Date" type="date" max={today} defaultValue={today} required />
            <Field id="generationKwh" label="Generated (kWh)" type="number" step="0.01" min="0" required />
            <Field id="exportedKwh" label="Exported (kWh)" type="number" step="0.01" min="0" />
            <Field id="gridImportKwh" label="Imported (kWh)" type="number" step="0.01" min="0" />
            <Button type="submit" disabled={genPending}>
              {genPending ? 'Saving' : 'Save reading'}
            </Button>
            <div className="sm:col-span-2 lg:col-span-5">
              <Feedback state={gen} />
              {!gen && (
                <p className="text-[12px] text-muted-foreground">
                  Use the day total from your inverter app or net meter. Saving the same date again replaces it.
                </p>
              )}
            </div>
          </form>
        )}

        {tab === 'bill' && (
          <form action={billAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field id="month" label="Billing month" type="month" max={today.slice(0, 7)} required />
            <Field id="consumptionKwh" label="Units (kWh)" type="number" step="1" min="0" required />
            <Field id="billAmount" label="Bill amount (₹)" type="number" step="1" min="0" required />
            <Field id="peakDemandKw" label="Peak demand (kW)" type="number" step="0.1" min="0" />
            <Button type="submit" disabled={billPending}>
              {billPending ? 'Saving' : 'Save bill'}
            </Button>
            <div className="sm:col-span-2 lg:col-span-5">
              <Feedback state={bill} />
              {!bill && (
                <p className="text-[12px] text-muted-foreground">
                  Bills drive sizing, the tariff used for savings, and the consumption forecast export.
                </p>
              )}
            </div>
          </form>
        )}

        {tab === 'csv' && (
          <form action={csvAction} className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Data type</Label>
              <Select id="kind" name="kind" defaultValue="generation">
                <option value="generation">Daily generation</option>
                <option value="consumption">Monthly consumption</option>
              </Select>
            </div>
            <Field id="file" label="CSV file (max 512 KB, 1,000 rows)" type="file" accept=".csv,text/csv" required />
            <Button type="submit" disabled={csvPending}>
              {csvPending ? 'Importing' : 'Import'}
            </Button>
            <div className="space-y-2 sm:col-span-3">
              <Feedback state={csv} />
              <div className="grid gap-2 text-[12px] text-muted-foreground sm:grid-cols-2">
                <p>
                  Generation columns:{' '}
                  <code className="num text-foreground">date, generation_kwh, exported_kwh, grid_import_kwh, peak_kw</code>
                </p>
                <p>
                  Consumption columns:{' '}
                  <code className="num text-foreground">date, consumption_kwh, bill_amount, peak_demand_kw</code>
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </Card>
  )
}
