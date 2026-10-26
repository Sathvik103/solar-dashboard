'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  importCsvAction,
  logConsumptionAction,
  logGenerationAction,
  type EnergyActionState,
} from '@/actions/energy'

function Feedback({ state }: { state: EnergyActionState | undefined }) {
  if (!state) return null
  return (
    <div role="status" className="space-y-1">
      {state.success && <p className="text-xs text-emerald-600">{state.success}</p>}
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.rowErrors?.map((e) => (
        <p key={e.line} className="text-xs text-destructive">
          Line {e.line}: {e.message}
        </p>
      ))}
    </div>
  )
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} name={id} {...props} />
    </div>
  )
}

export default function DataEntryPanel() {
  const [gen, genAction, genPending] = useActionState(logGenerationAction, undefined as EnergyActionState | undefined)
  const [bill, billAction, billPending] = useActionState(logConsumptionAction, undefined as EnergyActionState | undefined)
  const [csv, csvAction, csvPending] = useActionState(importCsvAction, undefined as EnergyActionState | undefined)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Log daily generation</CardTitle>
          <CardDescription className="text-xs">From your inverter app or net meter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={genAction} className="space-y-3">
            <Field id="recordDate" label="Date" type="date" max={today} defaultValue={today} required />
            <Field id="generationKwh" label="Generated (kWh)" type="number" step="0.01" min="0" required />
            <div className="grid grid-cols-2 gap-2">
              <Field id="exportedKwh" label="Exported (kWh)" type="number" step="0.01" min="0" />
              <Field id="gridImportKwh" label="Imported (kWh)" type="number" step="0.01" min="0" />
            </div>
            <Button type="submit" size="sm" disabled={genPending} className="w-full">
              {genPending ? 'Saving…' : 'Save day'}
            </Button>
            <Feedback state={gen} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add monthly bill</CardTitle>
          <CardDescription className="text-xs">Used for sizing, tariff and forecasts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={billAction} className="space-y-3">
            <Field id="month" label="Billing month" type="month" max={today.slice(0, 7)} required />
            <div className="grid grid-cols-2 gap-2">
              <Field id="consumptionKwh" label="Units (kWh)" type="number" step="1" min="0" required />
              <Field id="billAmount" label="Bill (₹)" type="number" step="1" min="0" required />
            </div>
            <Field id="peakDemandKw" label="Peak demand (kW, optional)" type="number" step="0.1" min="0" />
            <Button type="submit" size="sm" disabled={billPending} className="w-full">
              {billPending ? 'Saving…' : 'Save bill'}
            </Button>
            <Feedback state={bill} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Import CSV</CardTitle>
          <CardDescription className="text-xs">
            generation: date, generation_kwh, exported_kwh, grid_import_kwh · consumption: date,
            consumption_kwh, bill_amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={csvAction} className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="kind" className="text-xs">
                Data type
              </Label>
              <select
                id="kind"
                name="kind"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                defaultValue="generation"
              >
                <option value="generation">Daily generation</option>
                <option value="consumption">Monthly consumption</option>
              </select>
            </div>
            <Field id="file" label="File (max 512 KB)" type="file" accept=".csv,text/csv" required />
            <Button type="submit" size="sm" disabled={csvPending} className="w-full">
              {csvPending ? 'Importing…' : 'Import'}
            </Button>
            <Feedback state={csv} />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
