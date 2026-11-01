'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { upsertSolarProfileAction, type ProfileActionState } from '@/actions/solar-profile'
import type { SolarProfile } from '@/lib/types/user'
import { cn } from '@/lib/utils'

type FieldName = keyof NonNullable<ProfileActionState['errors']>

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b py-6 first:pt-0 last:border-b-0 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export default function SolarProfileForm({ existingProfile: p }: { existingProfile: SolarProfile | null }) {
  const [state, formAction, pending] = useActionState(upsertSolarProfileAction, undefined as ProfileActionState | undefined)

  const err = (name: FieldName) => state?.errors?.[name]?.[0]

  const field = (
    name: FieldName,
    label: string,
    input: React.ComponentProps<typeof Input>,
    opts: { hint?: string; wide?: boolean } = {}
  ) => (
    <div className={cn('flex flex-col gap-1.5', opts.wide && 'sm:col-span-2')}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} disabled={pending} aria-invalid={!!err(name)} {...input} />
      {err(name) ? (
        <p className="text-[12px] text-destructive">{err(name)}</p>
      ) : (
        opts.hint && <p className="text-[12px] text-muted-foreground">{opts.hint}</p>
      )}
    </div>
  )

  const select = (name: FieldName, label: string, defaultValue: string, options: [string, string][]) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} name={name} defaultValue={defaultValue} disabled={pending}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  )

  return (
    <form action={formAction} className="rounded-lg border bg-card">
      <div className="px-6 pt-6">
        <Section title="Location" description="Used to fetch weather and climate data for your roof.">
          {field('city', 'City', { defaultValue: p?.city || 'Hyderabad', required: true })}
          {field('state', 'State', { defaultValue: p?.state || 'Telangana', required: true })}
          {field('district', 'District', { defaultValue: p?.district || '' })}
          {field('pincode', 'Pincode', { defaultValue: p?.pincode || '', inputMode: 'numeric', maxLength: 6 })}
        </Section>

        <Section title="Consumption and connection" description="From a recent electricity bill. Bills logged in the Energy log take precedence.">
          {field('monthlyUnitsKwh', 'Monthly units (kWh)', { type: 'number', min: 0, defaultValue: p?.monthlyUnitsKwh ?? '' })}
          {field('monthlyBillInr', 'Monthly bill (₹)', { type: 'number', min: 0, defaultValue: p?.monthlyBillInr ?? '' })}
          {field(
            'sanctionedLoadKw',
            'Sanctioned load (kW)',
            { type: 'number', step: 0.5, min: 0, defaultValue: p?.sanctionedLoadKw ?? '' },
            { hint: 'Printed on the bill. Sets the fixed charge and the net-metering limit.' }
          )}
          {field(
            'electricityTariffInr',
            'Tariff override (₹/kWh)',
            { type: 'number', step: 0.01, min: 0, defaultValue: p?.electricityTariffInr ?? '' },
            { hint: 'Leave blank to use your bills or the LT-I slab rate.' }
          )}
        </Section>

        <Section title="Roof" description="Shade-free area and orientation drive the yield model.">
          {field('roofAreaSqft', 'Shade-free area (sq ft)', { type: 'number', min: 0, defaultValue: p?.roofAreaSqft ?? '' })}
          {select('roofType', 'Roof type', p?.roofType || 'flat-rcc', [
            ['flat-rcc', 'Flat RCC'],
            ['flat-concrete', 'Flat concrete'],
            ['sloped-tile', 'Sloped tile'],
            ['metal-sheet', 'Metal sheet'],
            ['other', 'Other'],
          ])}
          {select('roofOrientation', 'Faces', p?.roofOrientation || 'south', [
            ['south', 'South'],
            ['south-east', 'South-east'],
            ['south-west', 'South-west'],
            ['east', 'East'],
            ['west', 'West'],
            ['north', 'North'],
          ])}
          {select('shadingLevel', 'Shading', p?.shadingLevel || 'none', [
            ['none', 'None'],
            ['low', 'Low, mornings or evenings'],
            ['medium', 'Medium, nearby trees or buildings'],
            ['high', 'High'],
          ])}
        </Section>

        <Section title="System" description="Optional. A preferred size replaces the recommendation on the Overview.">
          {field('preferredCapacityKw', 'Preferred size (kW)', { type: 'number', step: 0.5, min: 0, defaultValue: p?.preferredCapacityKw ?? '' })}
          {field('budgetInr', 'Budget (₹)', { type: 'number', min: 0, defaultValue: p?.budgetInr ?? '' })}
          {select('batteryPreference', 'Battery', p?.batteryPreference || 'no-battery', [
            ['no-battery', 'Grid-tied, no battery'],
            ['add-battery-now', 'Hybrid with battery now'],
            ['future-expansion', 'Battery-ready inverter'],
          ])}
        </Section>
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
        <div role="status" className="text-[13px]">
          {state?.errors?.general && <span className="text-destructive">{state.errors.general.join(', ')}</span>}
          {state?.success && <span className="text-positive">Saved.</span>}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
