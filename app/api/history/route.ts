import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { getGenerationHistory, getUserConsumptionHistory } from '@/lib/dal/analytics'

export async function GET(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get('days')) || 30))
  try {
    const [generation, consumption] = await Promise.all([
      getGenerationHistory(days, user.id),
      getUserConsumptionHistory(user.id),
    ])
    return NextResponse.json({ generation, consumption }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/history] failed', error)
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 })
  }
}
