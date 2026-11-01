'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts'

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-plex-mono)' }

function ChartTooltip({ active, payload, label, unit }: Partial<TooltipContentProps<TooltipValueType, string | number>> & { unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-[12px] shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={String(p.dataKey)} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
            {p.name}
            <span className="num ml-auto pl-3 text-foreground">
              {Number(p.value).toFixed(2)} {unit}
            </span>
          </p>
        ))}
    </div>
  )
}

export function TodayOutputChart({ data, height = 240 }: { data: { hour: string; output: number }[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} unit=" kW" />
          <Tooltip cursor={{ stroke: 'var(--border)' }} content={(p) => <ChartTooltip {...p} unit="kW" />} />
          <Area
            type="monotone"
            dataKey="output"
            name="Estimated output"
            stroke="var(--chart-1)"
            strokeWidth={1.75}
            fill="var(--chart-1)"
            fillOpacity={0.12}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DailyEnergyChart({
  data,
  height = 240,
}: {
  data: { date: string; loggedKwh: number | null; modelledKwh: number | null }[]
  height?: number
}) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5).replace('-', '/') }))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} unit=" kWh" />
          <Tooltip cursor={{ fill: 'var(--muted)' }} content={(p) => <ChartTooltip {...p} unit="kWh" />} />
          <Bar dataKey="loggedKwh" name="Logged" fill="var(--chart-2)" radius={[2, 2, 0, 0]} maxBarSize={14} animationDuration={700} />
          <Line
            type="monotone"
            dataKey="modelledKwh"
            name="Modelled"
            stroke="var(--chart-1)"
            strokeWidth={1.75}
            dot={false}
            connectNulls
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Simple vertical bars for a short daily series; null values render as gaps. */
export function DailyBars({
  data,
  unit,
  height = 200,
}: {
  data: { date: string; value: number | null }[]
  unit: string
  height?: number
}) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5).replace('-', '/') }))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} unit={` ${unit}`} />
          <Tooltip cursor={{ fill: 'var(--muted)' }} content={(p) => <ChartTooltip {...p} unit={unit} />} />
          <Bar dataKey="value" name="Energy" fill="var(--chart-1)" radius={[2, 2, 0, 0]} maxBarSize={36} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string; shape?: 'bar' | 'line' }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className={i.shape === 'line' ? 'h-0.5 w-3' : 'size-2.5 rounded-[2px]'}
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  )
}
