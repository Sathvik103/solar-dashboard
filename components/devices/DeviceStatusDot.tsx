import { cn } from '@/lib/utils'
import type { DeviceStatus } from '@/lib/iot/samples'

const LABEL: Record<DeviceStatus, string> = {
  online: 'Online',
  delayed: 'Delayed',
  offline: 'Offline',
  never: 'Waiting for data',
}

export default function DeviceStatusDot({ status, showLabel = true }: { status: DeviceStatus; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className="relative flex size-2">
        {status === 'online' && <span className="absolute inset-0 animate-ping rounded-full bg-positive/60" />}
        <span
          className={cn(
            'relative size-2 rounded-full',
            status === 'online' && 'bg-positive',
            status === 'delayed' && 'bg-warning',
            status === 'offline' && 'bg-destructive',
            status === 'never' && 'bg-muted-foreground/40'
          )}
        />
      </span>
      {showLabel && LABEL[status]}
    </span>
  )
}

export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never'
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
