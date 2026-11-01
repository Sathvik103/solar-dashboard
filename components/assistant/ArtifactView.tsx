'use client'

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Artifact } from '@/lib/agent/artifacts'

const AXIS = { fontSize: 10.5, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-plex-mono)' }
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

function fmt(v: unknown, unit: string) {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  if (unit === '₹') return `₹${Math.round(n).toLocaleString('en-IN')}`
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`
}

export default function ArtifactView({ artifact }: { artifact: Artifact }) {
  if (artifact.type === 'table') {
    return (
      <figure className="animate-in-up overflow-hidden rounded-md border">
        <figcaption className="border-b bg-muted/50 px-3 py-2 text-[12px] font-medium">{artifact.title}</figcaption>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b text-left">
                {artifact.columns.map((c, i) => (
                  <th key={c} className={`px-3 py-1.5 font-medium text-muted-foreground ${i ? 'text-right' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {artifact.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j} className={`px-3 py-1.5 ${j ? 'num text-right' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {artifact.note && <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">{artifact.note}</p>}
      </figure>
    )
  }

  const Chart = artifact.kind === 'line' ? LineChart : BarChart
  return (
    <figure className="animate-in-up rounded-md border p-3">
      <figcaption className="mb-2 text-[12px] font-medium">{artifact.title}</figcaption>
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={artifact.data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey={artifact.xKey} tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              formatter={(v, name) => [fmt(v, artifact.unit), name]}
            />
            {artifact.series.map((s, i) =>
              artifact.kind === 'line' ? (
                <Line key={s.key} dataKey={s.key} name={s.label} stroke={COLORS[i % 3]} strokeWidth={1.75} dot={false} animationDuration={700} />
              ) : (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % 3]} radius={[2, 2, 0, 0]} maxBarSize={28} animationDuration={700} />
              )
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      {artifact.note && <p className="mt-1.5 text-[11px] text-muted-foreground">{artifact.note}</p>}
    </figure>
  )
}
