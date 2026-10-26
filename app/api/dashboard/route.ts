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
    const overview = await buildDashboardOverview(user.id)
    // Profile contains personal details the client already gets via the profile page; omit it here.
    return NextResponse.json({ ...overview, profile: undefined }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/dashboard] failed', error)
    return NextResponse.json({ error: 'Failed to build dashboard' }, { status: 500 })
  }
}
