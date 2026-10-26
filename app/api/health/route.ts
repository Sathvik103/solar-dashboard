import { createSupabaseServerClient } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

/** Liveness + dependency check. Returns 503 when the database is unreachable. */
export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = {}
  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('regional_statistics').select('id', { head: true, count: 'exact' }).limit(1)
    checks.database = error ? 'fail' : 'ok'
  } catch {
    checks.database = 'fail'
  }
  checks.embeddings = process.env.GEMINI_API_KEY ? 'ok' : 'fail'
  const healthy = checks.database === 'ok'
  return Response.json(
    { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
