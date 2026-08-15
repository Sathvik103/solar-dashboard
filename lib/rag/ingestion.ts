import 'server-only'

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { AI_CONFIG } from '@/lib/ai/config'
import { generateEmbeddingsBatch } from '@/lib/ai/embeddings'
import { chunkDocument } from '@/lib/rag/chunker'
import type { KnowledgeDocument, DocumentStatus } from '@/lib/types/user'

export type IngestDocumentInput = {
  title: string
  source: string
  sourceUrl: string
  organization: string
  documentType: string
  locationScope?: string
  publicationDate?: string | null
  effectiveDate?: string | null
  version?: string | null
  content: string
  status?: DocumentStatus
}

/**
 * Validates whether a given user ID is explicitly authorized as a knowledge admin.
 */
export function isKnowledgeAdmin(userId: string): boolean {
  const adminIds = (process.env.KNOWLEDGE_ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (adminIds.length === 0) {
    // In local development, allow if explicitly set or fallback for testing
    return process.env.NODE_ENV === 'development'
  }

  return adminIds.includes(userId)
}

/**
 * Validates source URL domain against approved domain allowlist.
 */
export function isApprovedSourceDomain(sourceUrl: string): boolean {
  try {
    const parsed = new URL(sourceUrl)
    const hostname = parsed.hostname.toLowerCase()
    return AI_CONFIG.ingestion.allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Admin-privileged ingestion pipeline.
 * Writes verified documents and chunks to database.
 */
export async function ingestDocument(
  input: IngestDocumentInput,
  actingUserId?: string
): Promise<{ documentId: string; chunkCount: number }> {
  if (actingUserId && !isKnowledgeAdmin(actingUserId)) {
    throw new Error('Unauthorized: User is not an authorized Knowledge Base Admin')
  }

  if (input.sourceUrl && !isApprovedSourceDomain(input.sourceUrl)) {
    throw new Error(
      `Disallowed source domain: ${input.sourceUrl}. Ingestion is restricted to official approved domains: ${AI_CONFIG.ingestion.allowedDomains.join(', ')}`
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Ingestion requires service-role key or standard server client with write policy
  const adminClient = createClient(
    supabaseUrl || '',
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const contentHash = crypto.createHash('sha256').update(input.content).digest('hex')

  // 1. Insert/Upsert Document Record
  const docPayload = {
    title: input.title,
    source: input.source,
    source_url: input.sourceUrl,
    organization: input.organization,
    document_type: input.documentType,
    location_scope: input.locationScope || 'Telangana',
    publication_date: input.publicationDate || null,
    effective_date: input.effectiveDate || null,
    version: input.version || null,
    content_hash: contentHash,
    status: input.status || 'published',
    updated_at: new Date().toISOString(),
  }

  const { data: docData, error: docError } = await adminClient
    .from('documents')
    .upsert(docPayload, { onConflict: 'content_hash' })
    .select('id')
    .single()

  if (docError || !docData) {
    throw new Error(`Failed to store document: ${docError?.message || 'Unknown database error'}`)
  }

  const documentId = docData.id

  // 2. Structure-aware Chunking
  const chunks = chunkDocument(input.content)
  if (chunks.length === 0) {
    return { documentId, chunkCount: 0 }
  }

  // 3. Generate 1536-dim Embeddings via Gemini
  const chunkTexts = chunks.map((c) => c.content)
  const embeddings = await generateEmbeddingsBatch(chunkTexts)

  // 4. Delete old chunks if updating existing document
  await adminClient.from('document_chunks').delete().eq('document_id', documentId)

  // 5. Store Chunks with Embeddings
  const chunkRows = chunks.map((chunk, idx) => ({
    document_id: documentId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    token_count: chunk.tokenCount,
    page_number: chunk.pageNumber,
    section_title: chunk.sectionTitle,
    metadata: chunk.metadata,
    embedding: embeddings[idx],
  }))

  const { error: chunkError } = await adminClient.from('document_chunks').insert(chunkRows)
  if (chunkError) {
    throw new Error(`Failed to store document chunks: ${chunkError.message}`)
  }

  return { documentId, chunkCount: chunkRows.length }
}
