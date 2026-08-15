import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { AI_CONFIG } from '@/lib/ai/config'
import type { RetrievalResult, RetrievalOptions } from '@/lib/types/rag'

export async function executeVectorSearch(
  queryEmbedding: number[],
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const topK = options.topK || AI_CONFIG.retrieval.defaultTopK
  const similarityThreshold =
    options.similarityThreshold ?? AI_CONFIG.retrieval.defaultSimilarityThreshold

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding as any,
    match_count: topK,
    similarity_threshold: similarityThreshold,
    filter_location_scope: options.locationScope || null,
    filter_document_type: options.documentType || null,
    filter_organization: options.organization || null,
  })

  if (error) {
    throw new Error(`Vector similarity search failed: ${error.message}`)
  }

  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map((row: any) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    content: row.content,
    similarity: parseFloat(Number(row.similarity).toFixed(4)),
    pageNumber: row.page_number,
    sectionTitle: row.section_title,
    chunkIndex: row.chunk_index,
    source: {
      title: row.document_title,
      organization: row.organization,
      sourceUrl: row.source_url,
      documentType: row.document_type,
      locationScope: row.location_scope,
      publicationDate: row.publication_date,
      effectiveDate: row.effective_date,
      version: row.version,
    },
  }))
}
