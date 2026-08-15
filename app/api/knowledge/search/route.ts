import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { KnowledgeSearchSchema } from '@/lib/validations/knowledge'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'

export async function POST(request: Request) {
  try {
    await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parseResult = KnowledgeSearchSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const { query, topK, similarityThreshold, locationScope, documentType, organization } =
      parseResult.data

    const results = await searchKnowledgeBase(query, {
      topK,
      similarityThreshold,
      locationScope,
      documentType,
      organization,
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Knowledge base retrieval failed' },
      { status: 500 }
    )
  }
}
