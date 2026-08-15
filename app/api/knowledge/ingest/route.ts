import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { isKnowledgeAdmin, ingestDocument } from '@/lib/rag/ingestion'
import { KnowledgeIngestSchema } from '@/lib/validations/knowledge'

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin authorization check (Correction 2)
  if (!isKnowledgeAdmin(user.id)) {
    return NextResponse.json(
      { error: 'Forbidden: Knowledge ingestion requires explicit admin authorization' },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parseResult = KnowledgeIngestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await ingestDocument(parseResult.data, user.id)
    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunkCount: result.chunkCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ingestion failed' },
      { status: 500 }
    )
  }
}
