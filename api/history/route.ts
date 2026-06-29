import { generateHistoryData } from '@/lib/solarData'

export async function GET() {
  const data = generateHistoryData()
  return Response.json(data)
}