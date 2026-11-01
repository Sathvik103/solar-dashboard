import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { getDevice, getDeviceSamples } from '@/lib/dal/devices'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'

/**
 * Incremental feed for the live device view. The client passes the timestamp of the newest sample it
 * already has (`since`) and receives only newer ones, so each poll is a small indexed range scan.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = await enforce('deviceLive', user.id)
  if (!limit.allowed) return tooManyRequests(limit)

  const { id } = await ctx.params
  const since = new URL(request.url).searchParams.get('since')
  const sinceMs = since ? Date.parse(since) : NaN
  const floor = Date.now() - 24 * 3600 * 1000
  const sinceIso = new Date(Number.isFinite(sinceMs) ? Math.max(sinceMs, floor) : floor).toISOString()

  try {
    const device = await getDevice(id)
    if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const samples = await getDeviceSamples(id, sinceIso, 500)
    return NextResponse.json(
      { status: device.status, lastSeenAt: device.lastSeenAt, lastPowerW: device.lastPowerW, samples },
      { headers: { ...rateLimitHeaders(limit), 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('[api/devices/live] failed', error)
    return NextResponse.json({ error: 'Failed to load samples' }, { status: 500 })
  }
}
