'use client'

import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LedgerRow } from '@/lib/billing/ledger'

const AXIS = { fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-plex-mono)' }
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Net units per month (positive = billed import, negative = banked export) and the running credit. */
export default function LedgerChart({ rows }: { rows: LedgerRow[] }) {
  const data = rows.map((r) => ({
    label: MONTH[Number(r.month.slice(5, 7)) - 1],
    net: r.netKwh,
    bank: r.closingBankKwh,
    forecast: r.source === 'forecast',
  }))
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} unit=" u" />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            formatter={(v, name) => [`${Number(v).toFixed(0)} kWh`, name === 'net' ? 'Net import (+) / export (−)' : 'Credit balance']}
          />
          <Bar dataKey="net" radius={[2, 2, 0, 0]} maxBarSize={28} animationDuration={700}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.net < 0 ? 'var(--chart-4)' : 'var(--chart-2)'}
                fillOpacity={d.forecast ? 0.35 : 0.9}
                stroke={d.forecast ? (d.net < 0 ? 'var(--chart-4)' : 'var(--chart-2)') : 'none'}
                strokeDasharray={d.forecast ? '3 2' : undefined}
              />
            ))}
          </Bar>
          <Line dataKey="bank" type="stepAfter" stroke="var(--chart-1)" strokeWidth={2} dot={false} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
