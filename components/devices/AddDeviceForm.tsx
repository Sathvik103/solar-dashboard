'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeviceAction, type DeviceActionState } from '@/actions/devices'
import TokenReveal from './TokenReveal'

export const KIND_LABEL = {
  inverter: 'Inverter',
  energy_meter: 'Energy meter',
  data_logger: 'Data logger',
  gateway: 'Gateway',
} as const

export const PROTOCOL_LABEL = {
  http: 'HTTP API',
  mqtt: 'MQTT bridge',
  modbus_tcp: 'Modbus agent',
  vendor_cloud: 'Vendor cloud',
  simulator: 'Simulator (test data)',
} as const

export default function AddDeviceForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [state, action, pending] = useActionState(createDeviceAction, undefined as DeviceActionState | undefined)

  if (state?.token && state.deviceId) {
    return (
      <div className="animate-in-up space-y-4 rounded-lg border bg-card p-5">
        <TokenReveal token={state.token} title={`${state.deviceName} is registered.`} />
        <Button asChild>
          <Link href={`/devices/${state.deviceId}`}>
            Open setup guide <ArrowRight />
          </Link>
        </Button>
      </div>
    )
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add device
      </Button>
    )
  }

  return (
    <form action={action} className="animate-in-up rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <p className="text-sm font-semibold">Register a device</p>
        <Button type="button" variant="ghost" size="icon-xs" aria-label="Cancel" onClick={() => setOpen(false)}>
          <X />
        </Button>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Rooftop inverter" maxLength={60} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Type</Label>
          <Select id="kind" name="kind" defaultValue="inverter">
            {Object.entries(KIND_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="protocol">Connects via</Label>
          <Select id="protocol" name="protocol" defaultValue="modbus_tcp">
            {Object.entries(PROTOCOL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendor">Make</Label>
          <Input id="vendor" name="vendor" placeholder="e.g. Growatt" maxLength={60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input id="model" name="model" placeholder="e.g. MIN 3000TL-X" maxLength={60} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="capacityKw">Rated capacity (kW)</Label>
          <Input id="capacityKw" name="capacityKw" type="number" step="0.1" min="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reportingIntervalS">Reporting interval</Label>
          <Select id="reportingIntervalS" name="reportingIntervalS" defaultValue="300">
            <option value="60">Every minute</option>
            <option value="300">Every 5 minutes</option>
            <option value="900">Every 15 minutes</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input id="serialNumber" name="serialNumber" maxLength={80} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t px-5 py-3">
        <p className="text-[12px] text-destructive" role="status">
          {state?.error}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? 'Registering' : 'Register and get token'}
        </Button>
      </div>
    </form>
  )
}
