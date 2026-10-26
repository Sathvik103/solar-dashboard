import 'server-only'

import { GoogleGenAI } from '@google/genai'
import { AI_CONFIG } from '@/lib/ai/config'
import { errorMessage } from '@/lib/utils'

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY
  if (!key) {
    throw new Error(
      'Missing GEMINI_API_KEY environment variable. Server-side Gemini API key must be defined.'
    )
  }
  return key
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text')
  }

  const apiKey = getGeminiApiKey()
  const ai = new GoogleGenAI({ apiKey })

  try {
    const response = await ai.models.embedContent({
      model: AI_CONFIG.embedding.fallbackModel,
      contents: text,
      config: {
        outputDimensionality: AI_CONFIG.embedding.dimension,
      },
    })

    const embedding = response.embeddings?.[0]?.values
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Gemini API returned an invalid or empty embedding payload')
    }

    if (embedding.length !== AI_CONFIG.embedding.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${AI_CONFIG.embedding.dimension}, received ${embedding.length}`
      )
    }

    return embedding
  } catch (error) {
    if (errorMessage(error)?.includes('outputDimensionality')) {
      // Fallback try text-embedding-004 without explicit config override if needed
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
        config: {
          outputDimensionality: AI_CONFIG.embedding.dimension,
        },
      })
      const embedding = response.embeddings?.[0]?.values
      if (embedding && embedding.length === AI_CONFIG.embedding.dimension) {
        return embedding
      }
    }
    throw new Error(`Failed to generate Gemini embedding: ${errorMessage(error) || error}`)
  }
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  for (const text of texts) {
    const embedding = await generateEmbedding(text)
    embeddings.push(embedding)
  }
  return embeddings
}
