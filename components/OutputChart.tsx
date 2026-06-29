'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { HourlyOutput } from "@/lib/solarData"

const chartConfig = {
  output: {
    label: "Output (kW)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function OutputChart({ data }: { data: HourlyOutput[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hourly Output Today</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
                type="monotone"
                dataKey="output"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.3}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}