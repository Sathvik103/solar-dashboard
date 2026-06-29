import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateDashboardData } from "@/lib/solarData"
import OutputChart from "@/components/OutputChart"

export default async function DashboardPage() {
  const data = generateDashboardData()

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Current Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.currentOutput.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">kW</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Today's Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.todayTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">kWh</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Money Saved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ₹{data.moneySavedToday.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">today</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <OutputChart data={data.hourlyData} />

    </div>
  )
}