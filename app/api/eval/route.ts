import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { runRetrievalEvaluation } from '@/lib/rag/evaluation'
import { evaluateSolarMLModel } from '@/lib/ml/evaluation'

export async function GET() {
  try {
    await requireUser()

    const ragMetrics = await runRetrievalEvaluation()
    const mlMetrics = evaluateSolarMLModel()

    return NextResponse.json({
      ragEvaluation: ragMetrics,
      mlEvaluation: mlMetrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 })
  }
}
