import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { runRetrievalEvaluation } from '@/lib/rag/evaluation'

export async function GET() {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const ragMetrics = await runRetrievalEvaluation()
    return NextResponse.json({ ragEvaluation: ragMetrics, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[api/eval] failed', error)
    return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
