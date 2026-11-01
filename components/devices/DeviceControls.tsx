'use client'

import { useActionState, useState } from 'react'
import { RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { archiveDeviceAction, rotateDeviceTokenAction, type DeviceActionState } from '@/actions/devices'
import TokenReveal from './TokenReveal'

export default function DeviceControls({ deviceId, name }: { deviceId: string; name: string }) {
  const [state, rotate, rotating] = useActionState(rotateDeviceTokenAction, undefined as DeviceActionState | undefined)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={rotate}>
          <input type="hidden" name="id" value={deviceId} />
          <Button type="submit" variant="outline" size="sm" disabled={rotating}>
            <RotateCw /> {rotating ? 'Rotating' : 'Rotate token'}
          </Button>
        </form>
        {confirming ? (
          <form action={archiveDeviceAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={deviceId} />
            <span className="text-[12px] text-muted-foreground">Remove {name}? Daily history is kept.</span>
            <Button type="submit" variant="destructive" size="sm">
              Remove
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 /> Remove device
          </Button>
        )}
      </div>
      {state?.error && <p className="text-[12px] text-destructive">{state.error}</p>}
      {state?.token && <TokenReveal token={state.token} title="New token issued. The old token no longer works." />}
    </div>
  )
}
