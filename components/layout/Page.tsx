import { cn } from '@/lib/utils'

/** Standard page frame: title row, optional actions, then content. */
export function Page({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8', className)}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-8 tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

/** A single headline figure. `value` is rendered in tabular mono. */
export function Stat({
  label,
  value,
  unit,
  note,
  tone,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  note?: React.ReactNode
  tone?: 'positive' | 'warning' | 'primary'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 bg-card px-5 py-4', className)}>
      <span className="eyebrow">{label}</span>
      <span
        className={cn(
          'num text-[26px] font-medium leading-8 tracking-tight',
          tone === 'positive' && 'text-positive',
          tone === 'warning' && 'text-warning',
          tone === 'primary' && 'text-primary'
        )}
      >
        {value}
        {unit && <span className="ml-1 font-sans text-[13px] font-normal text-muted-foreground">{unit}</span>}
      </span>
      {note && <span className="text-[12px] leading-5 text-muted-foreground">{note}</span>}
    </div>
  )
}

/** Stats separated by hairlines inside one bordered strip. */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed px-5 py-8 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{children}</div>}
    </div>
  )
}

export function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning'
  children: React.ReactNode
}) {
  return (
    <div
      role={tone === 'warning' ? 'alert' : 'note'}
      className={cn(
        'rounded-md border px-4 py-3 text-[13px]',
        tone === 'warning' ? 'border-warning/30 bg-warning/8 text-foreground' : 'bg-surface text-muted-foreground'
      )}
    >
      {children}
    </div>
  )
}

export const fmtInr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
export const fmtNum = (n: number, digits = 0) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })
