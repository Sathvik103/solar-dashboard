import type { RetrievalResult } from '@/lib/types/rag'

export type Citation = {
  id: string
  title: string
  organization: string
  sourceUrl: string
  documentType: string
  pageNumber: number | null
  sectionTitle: string | null
  chunkIndex: number
  similarity: number
  snippet: string
}

/**
 * Extracts unique citations from RAG retrieval results.
 */
export function extractCitations(results: RetrievalResult[]): Citation[] {
  const seen = new Set<string>()
  const citations: Citation[] = []

  for (const result of results) {
    const key = `${result.documentId}-${result.chunkIndex}`
    if (seen.has(key)) continue
    seen.add(key)

    citations.push({
      id: result.chunkId,
      title: result.source?.title || 'Authoritative Document',
      organization: result.source?.organization || 'Official Source',
      sourceUrl: result.source?.sourceUrl || '',
      documentType: result.source?.documentType || 'Official Document',
      pageNumber: result.pageNumber,
      sectionTitle: result.sectionTitle,
      chunkIndex: result.chunkIndex,
      similarity: result.similarity,
      snippet: result.content.slice(0, 200).trim() + '...',
    })
  }

  return citations
}

/**
 * Formats citations as a readable Markdown context block for the LLM prompt.
 */
export function formatRetrievalContextForLLM(results: RetrievalResult[]): string {
  if (results.length === 0) {
    return 'NO RELEVANT OFFICIAL DOCUMENTS WERE RETRIEVED FOR THIS QUERY.'
  }

  return results
    .map((res, idx) => {
      const org = res.source?.organization || 'Official Source'
      const title = res.source?.title || 'Document'
      const page = res.pageNumber ? `Page ${res.pageNumber}` : null
      const section = res.sectionTitle ? `Section: ${res.sectionTitle}` : null
      const location = [page, section].filter(Boolean).join(', ')

      return `[SOURCE ${idx + 1}]: ${org} — ${title} (${location || 'Full Doc'})
URL: ${res.source?.sourceUrl || 'N/A'}
CONTENT:
${res.content.trim()}
`
    })
    .join('\n---\n\n')
}
