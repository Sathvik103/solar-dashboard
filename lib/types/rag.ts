/**
 * RAG and Knowledge Base Domain Types — Phase 3
 */

export type DocumentStatus = 'draft' | 'published' | 'archived'

export type SourceMetadata = {
  title: string
  organization: string
  sourceUrl: string
  documentType: string
  locationScope: string
  publicationDate: string | null
  effectiveDate: string | null
  version: string | null
}



export type RetrievalResult = {
  chunkId: string
  documentId: string
  content: string
  similarity: number
  pageNumber: number | null
  sectionTitle: string | null
  chunkIndex: number
  source: SourceMetadata
}

export type RetrievalOptions = {
  topK?: number
  similarityThreshold?: number
  locationScope?: string
  documentType?: string
  organization?: string
}
