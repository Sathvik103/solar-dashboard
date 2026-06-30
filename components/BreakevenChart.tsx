'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { generateBreakevenCurves } from '@/lib/calculations'
import { panelTypes } from '@/lib/solarData'

type Props = {
  numberOfPanels: number
  dailySunlightHours: number
  electricityRate: number
}

const chartConfig = {
  Polycrystalline: { label: 'Polycrystalline', color: '#3b82f6' },
  'Monocrystalline PERC': { label: 'Monocrystalline PERC', color: '#16a34a' },
  TOPCon: { label: 'TOPCon', color: '#f59e0b' },
}

export default function BreakevenChart({ numberOfPanels, dailySunlightHours, electricityRate }: Props) {
  const data = generateBreakevenCurves(numberOfPanels, dailySunlightHours, electricityRate, panelTypes)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakeven Comparison — All Panel Types</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shows net position over 10 years. Where each line crosses zero is your breakeven point.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tickFormatter={(v) => `${v}m`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label="Breakeven" />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
              labelFormatter={(label) => `Month ${label}`}
            />
            <Legend />
            {panelTypes.map((panel) => (
              <Line
                key={panel.name}
                type="monotone"
                dataKey={panel.name}
                stroke={panel.color}
                dot={false}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}