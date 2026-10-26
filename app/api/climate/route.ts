import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { geocode, getMonthlyClimatology, WeatherUnavailableError } from '@/lib/data/weather'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Measured monthly GHI / temperature (ERA5 via Open-Meteo) for the signed-in user's city. */
export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await getSolarProfile(user.id)
    const coords = await geocode(profile?.city || 'Hyderabad', profile?.state)
    const monthly = await getMonthlyClimatology(coords)
    if (monthly.some((m) => m.ghiKwhM2Day <= 0)) {
      return NextResponse.json({ error: 'Incomplete climate data' }, { status: 502 })
    }
    return NextResponse.json(
      {
        place: coords.label,
        source: 'ERA5 reanalysis via Open-Meteo (3-year monthly mean)',
        monthly: monthly.map((m) => ({ month: MONTHS[m.month], ghi: m.ghiKwhM2Day, avgTempC: m.tempC })),
      },
      { headers: { 'Cache-Control': 'private, max-age=86400' } }
    )
  } catch (error) {
    if (error instanceof WeatherUnavailableError) {
      return NextResponse.json({ error: 'Climate provider unavailable' }, { status: 503 })
    }
    console.error('[api/climate] failed', error)
    return NextResponse.json({ error: 'Failed to load climate data' }, { status: 500 })
  }
}
