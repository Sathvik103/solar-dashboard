import { z } from 'zod'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'

export const SearchKnowledgeSchema = z.object({
  query: z.string().min(3).describe('Natural language question to search in the solar knowledge base'),
  topK: z.number().min(1).max(10).default(4).describe('Number of top relevant chunks to retrieve'),
  similarityThreshold: z.number().min(0.1).max(0.8).default(0.3).describe('Cosine similarity threshold'),
  organization: z.string().optional().describe('Optional filter by organization (TGERC, TGREDCO, TSSPDCL, MNRE)'),
})

export type SearchKnowledgeInput = z.infer<typeof SearchKnowledgeSchema>

export async function searchKnowledgeTool(input: SearchKnowledgeInput) {
  try {
    const results = await searchKnowledgeBase(input.query, {
      topK: input.topK,
      similarityThreshold: input.similarityThreshold,
      organization: input.organization,
    })

    return {
      query: input.query,
      retrievalCount: results.length,
      chunks: results.map((r) => ({
        chunkId: r.chunkId,
        content: r.content,
        similarity: r.similarity,
        pageNumber: r.pageNumber,
        sectionTitle: r.sectionTitle,
        source: {
          title: r.source.title,
          organization: r.source.organization,
          sourceUrl: r.source.sourceUrl,
          documentType: r.source.documentType,
          effectiveDate: r.source.effectiveDate || r.source.publicationDate,
        },
      })),
    }
  } catch (error: any) {
    return {
      query: input.query,
      retrievalCount: 0,
      error: error.message,
      chunks: [],
    }
  }
}
