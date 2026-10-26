import 'server-only'

import { searchKnowledgeBase } from '@/lib/rag/retrieval'
import type { RetrievalResult } from '@/lib/types/rag'
import {
  TELANGANA_EVALUATION_QUERIES,
  type EvaluationQuery,
} from '@/lib/rag/evaluationQueries'

export type { EvaluationQuery }
export { TELANGANA_EVALUATION_QUERIES }

export type EvaluationResult = {
  queryId: number
  query: string
  expectedOrganization: string
  expectedTopic: string
  category: string
  retrievedCount: number
  expectedSourceFound: boolean
  expectedSourceRank: number | null // 1-based rank or null if not found
  topSimilarityScore: number | null
  retrievedSources: {
    rank: number
    title: string
    organization: string
    sourceUrl: string
    similarity: number
    sectionTitle: string | null
  }[]
}

export type EvaluationSummary = {
  totalQueries: number
  hitCount: number
  top1Count: number
  top3Count: number
  hitRate: number
  top1Accuracy: number
  top3Accuracy: number
  mrr: number
  avgTopSimilarity: number
  results: EvaluationResult[]
}

/**
 * Runs the source retrieval evaluation benchmark against the knowledge base.
 * Evaluates dense/vector search performance across all test queries without calling an LLM.
 */
export async function runRetrievalEvaluation(
  queries: EvaluationQuery[] = TELANGANA_EVALUATION_QUERIES
): Promise<EvaluationSummary> {
  const results: EvaluationResult[] = []
  let hitCount = 0
  let top1Count = 0
  let top3Count = 0
  let reciprocalRankSum = 0
  let totalTopScoreSum = 0

  for (const evalQuery of queries) {
    let retrieved: RetrievalResult[] = []
    try {
      retrieved = await searchKnowledgeBase(evalQuery.query, {
        topK: 5,
        similarityThreshold: 0.25,
      })
    } catch {
      retrieved = []
    }

    const retrievedSources = retrieved.map((r, index) => ({
      rank: index + 1,
      title: r.source?.title || 'Unknown',
      organization: r.source?.organization || 'Unknown',
      sourceUrl: r.source?.sourceUrl || '',
      similarity: r.similarity || 0,
      sectionTitle: r.sectionTitle || null,
    }))

    const matchIndex = retrievedSources.findIndex(
      (s) =>
        s.organization.toLowerCase().includes(evalQuery.expectedOrganization.toLowerCase()) ||
        evalQuery.expectedOrganization.toLowerCase().includes(s.organization.toLowerCase())
    )

    const expectedSourceFound = matchIndex !== -1
    const expectedSourceRank = matchIndex !== -1 ? matchIndex + 1 : null

    if (expectedSourceFound) {
      hitCount++
      if (expectedSourceRank === 1) top1Count++
      if (expectedSourceRank && expectedSourceRank <= 3) top3Count++
      if (expectedSourceRank) reciprocalRankSum += 1 / expectedSourceRank
    }

    const topScore = retrievedSources.length > 0 ? retrievedSources[0].similarity : null
    if (topScore) totalTopScoreSum += topScore

    results.push({
      queryId: evalQuery.id,
      query: evalQuery.query,
      expectedOrganization: evalQuery.expectedOrganization,
      expectedTopic: evalQuery.expectedTopic,
      category: evalQuery.category,
      retrievedCount: retrievedSources.length,
      expectedSourceFound,
      expectedSourceRank,
      topSimilarityScore: topScore,
      retrievedSources,
    })
  }

  const totalQueries = queries.length
  const hitRate = totalQueries > 0 ? parseFloat(((hitCount / totalQueries) * 100).toFixed(1)) : 0
  const top1Accuracy = totalQueries > 0 ? parseFloat(((top1Count / totalQueries) * 100).toFixed(1)) : 0
  const top3Accuracy = totalQueries > 0 ? parseFloat(((top3Count / totalQueries) * 100).toFixed(1)) : 0
  const mrr = totalQueries > 0 ? parseFloat((reciprocalRankSum / totalQueries).toFixed(3)) : 0
  const avgTopSimilarity = totalQueries > 0 ? parseFloat((totalTopScoreSum / (totalQueries || 1)).toFixed(4)) : 0

  return {
    totalQueries,
    hitCount,
    top1Count,
    top3Count,
    hitRate,
    top1Accuracy,
    top3Accuracy,
    mrr,
    avgTopSimilarity,
    results,
  }
}
