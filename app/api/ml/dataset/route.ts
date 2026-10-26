import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/dal/users'
import { prepareMLTrainingDataset } from '@/lib/ml/dataset'

const QuerySchema = z.object({
  type: z.enum(['consumption_forecast', 'solar_generation_forecast', 'energy_analysis']).default('consumption_forecast'),
})

/** Training dataset export for the external Python pipeline (see docs/ml-integration.md). */
export async function GET(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid dataset type' }, { status: 400 })

  try {
    const dataset = await prepareMLTrainingDataset(user.id, parsed.data.type)
    return NextResponse.json(dataset, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/ml/dataset] failed', error)
    return NextResponse.json({ error: 'Failed to export dataset' }, { status: 500 })
  }
}
