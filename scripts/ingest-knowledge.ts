import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { GoogleGenAI } from '@google/genai'
import { tgercRegulation2016 } from '../data/knowledge/telangana-solar/tgerc-rooftop-regulations-2016'
import { tgredcoGuidelines } from '../data/knowledge/telangana-solar/tgredco-rooftop-guidelines'
import { tsspdclGuide } from '../data/knowledge/telangana-solar/tsspdcl-netmetering-guide'
import { mnrePmSuryaGharGuidelines } from '../data/knowledge/telangana-solar/mnre-pm-surya-ghar-guidelines'
import { chunkDocument } from '../lib/rag/chunker'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yqaigbuigqoowmgxxlpg.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_J7NbvQ6XNk_yE8ZP29swmg_gQIoowxw'

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY

async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const ai = new GoogleGenAI({ apiKey })
  const embeddings: number[][] = []

  for (const text of texts) {
    try {
      const res: any = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 1536 },
      })
      const vals = res.embeddings?.[0]?.values || res.embedding?.values
      if (!vals || vals.length !== 1536) {
        throw new Error(`Invalid embedding dimension: ${vals?.length}`)
      }
      embeddings.push(vals)
    } catch (e: any) {
      // Fallback to text-embedding-004
      const res: any = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
        config: { outputDimensionality: 1536 },
      })
      const vals = res.embeddings?.[0]?.values || res.embedding?.values
      if (!vals) throw new Error(`Failed to generate embedding: ${e.message}`)
      embeddings.push(vals)
    }
  }
  return embeddings
}

export async function runIngestion() {
  console.log('====================================================')
  console.log('  SOLAR INTELLIGENCE PLATFORM — KNOWLEDGE INGESTION  ')
  console.log('====================================================')
  console.log(`Connecting to Supabase: ${SUPABASE_URL}`)

  const activeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  const supabase = createClient(SUPABASE_URL, activeKey)

  if (!SUPABASE_SERVICE_KEY) {
    console.log('\n⚠️ Notice: SUPABASE_SERVICE_ROLE_KEY is not set in environment.')
    console.log('   Knowledge Base writes are protected by PostgreSQL RLS.')
    console.log('   To ingest documents directly into Supabase, add SUPABASE_SERVICE_ROLE_KEY to .env.local')
  }

  const docsToIngest = [
    tgercRegulation2016,
    tgredcoGuidelines,
    tsspdclGuide,
    mnrePmSuryaGharGuidelines,
  ]

  let totalDocs = 0
  let totalChunks = 0

  for (const doc of docsToIngest) {
    console.log(`\n📄 Processing: [${doc.organization}] ${doc.title}`)
    const contentHash = crypto.createHash('sha256').update(doc.content).digest('hex')

    // 1. Chunk document
    const chunks = chunkDocument(doc.content, { maxChunkSize: 800, minChunkSize: 150, overlap: 100 })
    console.log(`   Chunked into ${chunks.length} structure-aware sections.`)

    // 2. Generate embeddings if GEMINI_KEY available
    let embeddings: number[][] = []
    if (GEMINI_KEY) {
      console.log(`   Generating 1536-dim Gemini embeddings...`)
      try {
        embeddings = await generateEmbeddings(chunks.map((c) => c.content), GEMINI_KEY)
        console.log(`   ✅ Generated ${embeddings.length} vectors successfully.`)
      } catch (err: any) {
        console.warn(`   ⚠️ Embedding generation failed: ${err.message}`)
      }
    } else {
      console.log(`   ℹ️ No GEMINI_API_KEY present in environment. Ingesting chunks without vector embeddings.`)
    }

    // 3. Upsert document
    const { data: docData, error: docErr } = await supabase
      .from('documents')
      .upsert(
        {
          title: doc.title,
          source: doc.source,
          source_url: doc.sourceUrl,
          organization: doc.organization,
          document_type: doc.documentType,
          location_scope: doc.locationScope || 'Telangana',
          publication_date: doc.publicationDate || null,
          effective_date: doc.effectiveDate || null,
          version: doc.version || null,
          content_hash: contentHash,
          status: doc.status || 'published',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'content_hash' }
      )
      .select('id')
      .single()

    if (docErr || !docData) {
      console.error(`   ❌ Failed to upsert document: ${docErr?.message}`)
      continue
    }

    const documentId = docData.id
    totalDocs++

    // 4. Delete existing chunks for this document
    await supabase.from('document_chunks').delete().eq('document_id', documentId)

    // 5. Insert new chunks
    const chunkRows = chunks.map((chunk, idx) => ({
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      token_count: chunk.tokenCount,
      page_number: chunk.pageNumber,
      section_title: chunk.sectionTitle,
      metadata: chunk.metadata,
      embedding: embeddings[idx] || null,
    }))

    const { error: chunkErr } = await supabase.from('document_chunks').insert(chunkRows)
    if (chunkErr) {
      console.error(`   ❌ Failed to insert chunks: ${chunkErr.message}`)
    } else {
      totalChunks += chunkRows.length
      console.log(`   ✅ Stored ${chunkRows.length} chunks in database.`)
    }
  }

  console.log('\n====================================================')
  console.log(`Ingestion Complete! Ingested ${totalDocs} documents, ${totalChunks} chunks.`)
  console.log('====================================================')
}

// Execute if run directly
if (require.main === module || process.argv[1]?.includes('ingest-knowledge')) {
  runIngestion().catch(console.error)
}
