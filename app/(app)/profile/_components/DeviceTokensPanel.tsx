'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createDeviceTokenAction, revokeDeviceTokenAction, type DeviceTokenActionState } from '@/actions/devices'
import type { DeviceTokenRecord } from '@/lib/dal/devices'

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'

export default function DeviceTokensPanel({ devices }: { devices: DeviceTokenRecord[] }) {
  const [state, action, pending] = useActionState(createDeviceTokenAction, undefined as DeviceTokenActionState | undefined)

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Connected devices</CardTitle>
          <CardDescription>
            An inverter, data logger or home-automation hub can push daily totals to{' '}
            <code className="num text-foreground">POST /api/telemetry</code> with a bearer token.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="device-name">Device name</Label>
            <Input id="device-name" name="name" placeholder="Rooftop inverter" maxLength={60} required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating' : 'Create token'}
          </Button>
        </form>

        {state?.error && <p className="text-[12px] text-destructive">{state.error}</p>}
        {state?.token && (
          <div role="status" className="space-y-2 rounded-md border border-warning/30 bg-warning/8 p-4">
            <p className="text-[13px] font-medium">Token for {state.name}. Copy it now; it is shown only once.</p>
            <code className="num block rounded-sm border bg-card px-2 py-1.5 text-[12px] break-all select-all">{state.token}</code>
            <pre className="num overflow-x-auto rounded-sm bg-card p-2 text-[11px] leading-5 text-muted-foreground">
              {`curl -X POST $APP_URL/api/telemetry \\
  -H "Authorization: Bearer ${state.token}" \\
  -H "Content-Type: application/json" \\
  -d '{"readings":[{"date":"2026-11-01","generation_kwh":14.2,"exported_kwh":6.1}]}'`}
            </pre>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No devices connected.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {d.name} <code className="num text-[12px] font-normal text-muted-foreground">{d.tokenPrefix}…</code>
                  </p>
                  <p className="text-[12px] text-muted-foreground">Last used {fmt(d.lastUsedAt)}</p>
                </div>
                {d.revokedAt ? (
                  <Badge variant="outline">Revoked</Badge>
                ) : (
                  <form action={revokeDeviceTokenAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" size="xs" variant="destructive">
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
