import 'server-only'

import { generateEmbedding } from '@/lib/ai/embeddings'
import { executeVectorSearch } from '@/lib/dal/knowledge'
import type { RetrievalResult, RetrievalOptions } from '@/lib/types/rag'

/**
 * Pure RAG Retrieval Engine — Phase 3
 *
 * Accepts a natural-language question, generates a 1536-dim query embedding
 * via Gemini, performs PostgreSQL vector similarity search via pgvector,
 * and returns ranked source passages with complete provenance metadata.
 *
 * DOES NOT CALL ANY LLM GENERATION / CHATBOT MODEL.
 */
export async function searchKnowledgeBase(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  if (!query || query.trim().length < 3) {
    throw new Error('Query string must be at least 3 characters long')
  }

  // 1. Generate 1536-dim query embedding using Gemini
  const queryEmbedding = await generateEmbedding(query)

  // 2. Perform vector similarity search via Supabase pgvector RPC
  const results = await executeVectorSearch(queryEmbedding, options)

  return results
}
