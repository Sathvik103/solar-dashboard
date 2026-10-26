'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

type HourlyOutput = { hour: string; output: number }

const chartConfig = {
  output: {
    label: 'Output (kW)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

export default function OutputChart({ data }: { data: HourlyOutput[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated Hourly Output Today</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            No modelled output. Complete your solar profile and make sure weather data is reachable.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit=" kW" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="output" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
