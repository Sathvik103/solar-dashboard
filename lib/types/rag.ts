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

export type KnowledgeDocument = {
  id: string
  title: string
  source: string
  sourceUrl: string
  organization: string
  documentType: string
  locationScope: string
  publicationDate: string | null
  effectiveDate: string | null
  version: string | null
  contentHash: string
  status: DocumentStatus
  createdAt: string
  updatedAt: string
}

export type DocumentChunk = {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  tokenCount: number
  pageNumber: number | null
  sectionTitle: string | null
  metadata: Record<string, unknown>
  embedding?: number[]
  createdAt: string
  updatedAt: string
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
