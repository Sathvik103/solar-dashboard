import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { runRetrievalEvaluation } from '@/lib/rag/evaluation'
import { enforce, tooManyRequests } from '@/lib/rate-limit'

export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = await enforce('evaluation', user.id)
  if (!limit.allowed) return tooManyRequests(limit, 'The benchmark can run 3 times per 10 minutes.')
  try {
    const ragMetrics = await runRetrievalEvaluation()
    return NextResponse.json({ ragEvaluation: ragMetrics, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[api/eval] failed', error)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
