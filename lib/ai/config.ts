/**
 * Centralized AI & RAG Configuration
 *
 * Phase 3 Specification:
 * - Embedding Provider: Google Gemini API
 * - Embedding Model: gemini-embedding-001
 * - Target Dimension: 1536
 * - Similarity Metric: Cosine similarity
 * - Default TopK: 5
 * - Default Similarity Threshold: 0.5 (configurable)
 */

export const AI_CONFIG = {
  embedding: {
    provider: 'google-gemini',
    model: 'text-embedding-004', // gemini embedding model alias or text-embedding-004
    fallbackModel: 'gemini-embedding-001',
    dimension: 1536,
  },
  retrieval: {
    defaultTopK: 5,
    defaultSimilarityThreshold: 0.5,
    maxTopK: 20,
  },
  ingestion: {
    allowedDomains: [
      'tgredco.telangana.gov.in',
      'tgerc.telangana.gov.in',
      'tssouthernpower.com',
      'pmsuryaghar.gov.in',
      'mnre.gov.in',
    ],
  },
} as const
