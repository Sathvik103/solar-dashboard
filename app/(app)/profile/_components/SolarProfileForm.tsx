'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { upsertSolarProfileAction, type ProfileActionState } from '@/actions/solar-profile'
import type { SolarProfile } from '@/lib/types/user'

type Props = {
  existingProfile: SolarProfile | null
}

export default function SolarProfileForm({ existingProfile }: Props) {
  const [state, formAction, isPending] = useActionState(
    upsertSolarProfileAction,
    undefined as ProfileActionState | undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-3xl mx-auto pb-12">
      {state?.errors?.general && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {state.errors.general.join(', ')}
        </div>
      )}

      {state?.success && (
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
          Solar profile saved successfully!
        </div>
      )}

      {/* Section 1: Location */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Location</CardTitle>
          <CardDescription>Specify the geographical context for your solar setup.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              defaultValue={existingProfile?.city || 'Hyderabad'}
              required
              disabled={isPending}
            />
            {state?.errors?.city && <p className="text-xs text-destructive">{state.errors.city[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              defaultValue={existingProfile?.state || 'Telangana'}
              required
              disabled={isPending}
            />
            {state?.errors?.state && <p className="text-xs text-destructive">{state.errors.state[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="district">District</Label>
            <Input
              id="district"
              name="district"
              defaultValue={existingProfile?.district || 'Hyderabad'}
              disabled={isPending}
            />
            {state?.errors?.district && <p className="text-xs text-destructive">{state.errors.district[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pincode">Pincode (6 digits)</Label>
            <Input
              id="pincode"
              name="pincode"
              placeholder="500001"
              defaultValue={existingProfile?.pincode || ''}
              disabled={isPending}
            />
            {state?.errors?.pincode && <p className="text-xs text-destructive">{state.errors.pincode[0]}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Electricity Consumption */}
      <Card>
        <CardHeader>
          <CardTitle>Electricity Consumption & Tariff</CardTitle>
          <CardDescription>Enter your typical monthly electricity usage and billing details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monthlyBillInr">Avg. Monthly Bill (₹)</Label>
            <Input
              id="monthlyBillInr"
              name="monthlyBillInr"
              type="number"
              step="0.01"
              placeholder="3500"
              defaultValue={existingProfile?.monthlyBillInr ?? ''}
              disabled={isPending}
            />
            {state?.errors?.monthlyBillInr && (
              <p className="text-xs text-destructive">{state.errors.monthlyBillInr[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monthlyUnitsKwh">Avg. Monthly Units (kWh)</Label>
            <Input
              id="monthlyUnitsKwh"
              name="monthlyUnitsKwh"
              type="number"
              step="0.01"
              placeholder="450"
              defaultValue={existingProfile?.monthlyUnitsKwh ?? ''}
              disabled={isPending}
            />
            {state?.errors?.monthlyUnitsKwh && (
              <p className="text-xs text-destructive">{state.errors.monthlyUnitsKwh[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <Label htmlFor="electricityTariffInr">
              Current Tariff (₹/kWh){' '}
              <span className="text-xs text-muted-foreground font-normal">
                (Phase 2 convenience value — not authoritative. Authoritative tariff data coming in Phase 3.)
              </span>
            </Label>
            <Input
              id="electricityTariffInr"
              name="electricityTariffInr"
              type="number"
              step="0.1"
              placeholder="8.0"
              defaultValue={existingProfile?.electricityTariffInr ?? 8}
              disabled={isPending}
            />
            {state?.errors?.electricityTariffInr && (
              <p className="text-xs text-destructive">{state.errors.electricityTariffInr[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Roof Details */}
      <Card>
        <CardHeader>
          <CardTitle>Roof Details</CardTitle>
          <CardDescription>Provide physical characteristics of your rooftop.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roofAreaSqft">Usable Roof Area (sq ft)</Label>
            <Input
              id="roofAreaSqft"
              name="roofAreaSqft"
              type="number"
              step="1"
              placeholder="800"
              defaultValue={existingProfile?.roofAreaSqft ?? ''}
              disabled={isPending}
            />
            {state?.errors?.roofAreaSqft && (
              <p className="text-xs text-destructive">{state.errors.roofAreaSqft[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roofType">Roof Type</Label>
            <select
              id="roofType"
              name="roofType"
              defaultValue={existingProfile?.roofType || 'flat-concrete'}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="flat-concrete">Flat RCC / Concrete</option>
              <option value="sloped-tile">Sloped Tile</option>
              <option value="metal-sheet">Metal Sheet / Industrial</option>
              <option value="other">Other</option>
            </select>
            {state?.errors?.roofType && <p className="text-xs text-destructive">{state.errors.roofType[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roofOrientation">Roof Orientation</Label>
            <select
              id="roofOrientation"
              name="roofOrientation"
              defaultValue={existingProfile?.roofOrientation || 'south'}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="south">South (Optimal)</option>
              <option value="south-east">South-East</option>
              <option value="south-west">South-West</option>
              <option value="east">East</option>
              <option value="west">West</option>
              <option value="north">North</option>
            </select>
            {state?.errors?.roofOrientation && (
              <p className="text-xs text-destructive">{state.errors.roofOrientation[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shadingLevel">Rooftop Shading Level</Label>
            <select
              id="shadingLevel"
              name="shadingLevel"
              defaultValue={existingProfile?.shadingLevel || 'none'}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="none">No Shading (Full Sun)</option>
              <option value="low">Low Shading (Partial Morning/Evening)</option>
              <option value="medium">Medium Shading (Nearby Trees/Buildings)</option>
              <option value="high">High Shading</option>
            </select>
            {state?.errors?.shadingLevel && (
              <p className="text-xs text-destructive">{state.errors.shadingLevel[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 4: System Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>System Preferences & Budget</CardTitle>
          <CardDescription>Tell us about your target capacity and battery plans.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budgetInr">Target Budget (₹)</Label>
            <Input
              id="budgetInr"
              name="budgetInr"
              type="number"
              step="10000"
              placeholder="250000"
              defaultValue={existingProfile?.budgetInr ?? ''}
              disabled={isPending}
            />
            {state?.errors?.budgetInr && <p className="text-xs text-destructive">{state.errors.budgetInr[0]}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredCapacityKw">Preferred Capacity (kW)</Label>
            <Input
              id="preferredCapacityKw"
              name="preferredCapacityKw"
              type="number"
              step="0.5"
              placeholder="5.0"
              defaultValue={existingProfile?.preferredCapacityKw ?? ''}
              disabled={isPending}
            />
            {state?.errors?.preferredCapacityKw && (
              <p className="text-xs text-destructive">{state.errors.preferredCapacityKw[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <Label htmlFor="batteryPreference">Battery Backup Preference</Label>
            <select
              id="batteryPreference"
              name="batteryPreference"
              defaultValue={existingProfile?.batteryPreference || 'no-battery'}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="no-battery">Grid-Tied (No Battery)</option>
              <option value="add-battery-now">Hybrid (Battery Backup Included Now)</option>
              <option value="future-expansion">Grid-Tied with Battery-Ready Inverter</option>
            </select>
            {state?.errors?.batteryPreference && (
              <p className="text-xs text-destructive">{state.errors.batteryPreference[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? 'Saving profile...' : 'Save Solar Profile'}
        </Button>
      </div>
    </form>
  )
}
