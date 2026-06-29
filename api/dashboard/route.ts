import { generateDashboardData } from '@/lib/solarData'

export async function GET() {
  const data = generateDashboardData()
  return Response.json(data)
}