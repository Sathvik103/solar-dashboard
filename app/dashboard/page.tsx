import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { generateDashboardData } from "@/lib/solarData"
import OutputChart from "@/components/OutputChart"
import { AnimatedCard, AnimatedContainer } from '@/components/AnimatedCard'
import { motion } from 'framer-motion'
import PageWrapper from '@/components/PageWrapper'
function GridStatusBadge({ status }: { status: string }) {
  if (status === 'selling') return <Badge className="bg-green-500">Selling to Grid</Badge>
  if (status === 'buying') return <Badge className="bg-red-500">Buying from Grid</Badge>
  return <Badge className="bg-blue-500">Self Reliant</Badge>
}

export default async function DashboardPage() {
  const data = generateDashboardData()

  return (
    <PageWrapper>
  

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Monitor</h1>
        <GridStatusBadge status={data.gridStatus} />
      </div>

      <AnimatedContainer className="grid grid-cols-3 gap-4">
  <AnimatedCard>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Current Output</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.currentOutput.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">kW</p>
      </CardContent>
    </Card>
  </AnimatedCard>

  <AnimatedCard>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Today's Generation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{data.todayTotal.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">kWh</p>
      </CardContent>
    </Card>
  </AnimatedCard>

  <AnimatedCard>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Money Saved Today</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-green-600">₹{data.moneySavedToday.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">@ ₹8/kWh</p>
      </CardContent>
    </Card>
  </AnimatedCard>
</AnimatedContainer>

      <AnimatedContainer className="grid grid-cols-2 gap-4">
  <AnimatedCard>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Monthly Projection</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Projected</span>
          <span className="font-semibold">{data.projectedMonthly} kWh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Actual so far</span>
          <span className="font-semibold">{data.actualMonthly} kWh</span>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-muted-foreground">Predicted sun hours next month</span>
          <span className="font-semibold">{data.predictedSunHoursNextMonth} hrs/day</span>
        </div>
      </CardContent>
    </Card>
  </AnimatedCard>

  <AnimatedCard>
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Grid Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {data.gridStatus === 'selling' && (
          <>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Units sold to grid</span>
              <span className="font-semibold text-green-600">
                {(data.todayTotal - data.dailyConsumption).toFixed(2)} kWh
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Net metering earnings</span>
              <span className="font-semibold text-green-600">₹{data.netMeteringEarnings}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">@ ₹3.5/unit govt rate</p>
          </>
        )}
        {data.gridStatus === 'buying' && (
          <>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Units drawn from grid</span>
              <span className="font-semibold text-red-500">{data.gridUnitsDrawn} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Grid cost</span>
              <span className="font-semibold text-red-500">
                ₹{(data.gridUnitsDrawn * 8).toFixed(2)}
              </span>
            </div>
          </>
        )}
        {data.gridStatus === 'self-reliant' && (
          <p className="text-sm text-blue-600 font-semibold mt-2">
            Running entirely on solar today
          </p>
        )}
      </CardContent>
    </Card>
  </AnimatedCard>
</AnimatedContainer>
      <OutputChart data={data.hourlyData} />

    </PageWrapper>
  )
}