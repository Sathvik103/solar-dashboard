import { cn } from '@/lib/utils'

/** Wordmark: a single solar module in the accent colour. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 24 24" className="size-6 text-primary" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="currentColor" />
        <path d="M6 15h12M6 11.5h12M9.5 8v10M14.5 8v10" stroke="var(--primary-foreground)" strokeWidth="1.4" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">SolarIntel</span>
    </span>
  )
}
