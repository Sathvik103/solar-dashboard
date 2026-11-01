import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/dal/users'
import { KnowledgeSearchSchema } from '@/lib/validations/knowledge'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'
import { readJson } from '@/lib/http'

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = await enforce('knowledgeSearch', user.id)
  if (!limit.allowed) return tooManyRequests(limit)
  const headers = rateLimitHeaders(limit)

  const body = await readJson(request, KnowledgeSearchSchema, 16 * 1024, headers)
  if (!body.ok) return body.response

  try {
    const { query, topK, similarityThreshold, locationScope, documentType, organization } = body.data
    const results = await searchKnowledgeBase(query, { topK, similarityThreshold, locationScope, documentType, organization })
    return NextResponse.json({ results }, { headers })
  } catch (error) {
    console.error('[api/knowledge/search] failed', error)
    return NextResponse.json({ error: 'Knowledge base retrieval failed' }, { status: 500, headers })
  }
}
