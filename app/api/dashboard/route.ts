import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { buildDashboardOverview } from '@/lib/dashboard/overview'

export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { profile: _profile, ...overview } = await buildDashboardOverview(user.id)
    return NextResponse.json(overview, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/dashboard] failed', error)
    return NextResponse.json({ error: 'Failed to build dashboard' }, { status: 500 })
  }
}
