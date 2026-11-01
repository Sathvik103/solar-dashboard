import { Check, Minus, X, AlertTriangle } from 'lucide-react'
import type { BillCheck, CheckStatus } from '@/lib/billing/reconcile'
import { cn } from '@/lib/utils'

const ICON: Record<CheckStatus, React.ReactNode> = {
  ok: <Check className="size-3.5" />,
  warn: <AlertTriangle className="size-3.5" />,
  fail: <X className="size-3.5" />,
  skipped: <Minus className="size-3.5" />,
}

const TONE: Record<CheckStatus, string> = {
  ok: 'bg-positive/12 text-positive',
  warn: 'bg-warning/12 text-warning',
  fail: 'bg-destructive/10 text-destructive',
  skipped: 'bg-muted text-muted-foreground',
}

export const STATUS_LABEL: Record<CheckStatus, string> = {
  ok: 'All checks passed',
  warn: 'Worth a look',
  fail: 'Problems found',
  skipped: 'Not enough data',
}

export function StatusPill({ status }: { status: CheckStatus }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[11px] font-medium', TONE[status])}>
      {ICON[status]}
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function ChecksList({ checks }: { checks: BillCheck[] }) {
  const order: CheckStatus[] = ['fail', 'warn', 'ok', 'skipped']
  const sorted = [...checks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  return (
    <ul className="stagger divide-y rounded-md border">
      {sorted.map((c) => (
        <li key={c.id} className="flex gap-3 px-4 py-3">
          <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm', TONE[c.status])}>{ICON[c.status]}</span>
          <div className="min-w-0">
            <p className={cn('text-[13px] font-medium', c.status === 'skipped' && 'text-muted-foreground')}>{c.label}</p>
            <p className="text-[12.5px] leading-5 text-muted-foreground">{c.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
