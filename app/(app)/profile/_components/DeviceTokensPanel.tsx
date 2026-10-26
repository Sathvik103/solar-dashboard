'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createDeviceTokenAction,
  revokeDeviceTokenAction,
  type DeviceTokenActionState,
} from '@/actions/devices'
import type { DeviceTokenRecord } from '@/lib/dal/devices'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : 'never')

export default function DeviceTokensPanel({ devices }: { devices: DeviceTokenRecord[] }) {
  const [state, action, pending] = useActionState(
    createDeviceTokenAction,
    undefined as DeviceTokenActionState | undefined
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected devices</CardTitle>
        <CardDescription>
          Let your inverter, data logger or home-automation hub push daily generation to{' '}
          <code className="text-xs">POST /api/telemetry</code> with{' '}
          <code className="text-xs">Authorization: Bearer &lt;token&gt;</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="flex items-end gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <Label htmlFor="device-name" className="text-xs">
              Device name
            </Label>
            <Input id="device-name" name="name" placeholder="e.g. Rooftop inverter" maxLength={60} required />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Creating…' : 'Create token'}
          </Button>
        </form>

        {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
        {state?.token && (
          <div role="status" className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-1">
            <p className="text-xs font-semibold">
              Token for {state.name}. Copy it now; it will not be shown again.
            </p>
            <code className="block break-all text-xs select-all">{state.token}</code>
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">
              {`curl -X POST $APP_URL/api/telemetry -H "Authorization: Bearer ${state.token}" -H "Content-Type: application/json" -d '{"readings":[{"date":"2026-10-26","generation_kwh":14.2,"exported_kwh":6.1}]}'`}
            </pre>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices connected.</p>
        ) : (
          <ul className="divide-y text-sm">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {d.name} <code className="text-xs text-muted-foreground">{d.tokenPrefix}…</code>
                  </p>
                  <p className="text-xs text-muted-foreground">Last used: {fmt(d.lastUsedAt)}</p>
                </div>
                {d.revokedAt ? (
                  <Badge variant="outline" className="text-[10px]">
                    Revoked
                  </Badge>
                ) : (
                  <form action={revokeDeviceTokenAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" size="sm" variant="outline" className="text-xs h-7">
                      Revoke
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
