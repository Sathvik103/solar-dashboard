import { z } from 'zod'

export const KnowledgeSearchSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters long'),
  topK: z.coerce.number().min(1).max(20).default(5),
  similarityThreshold: z.coerce.number().min(0.0).max(1.0).default(0.5),
  locationScope: z.string().optional(),
  documentType: z.string().optional(),
  organization: z.string().optional(),
})

export const KnowledgeIngestSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  source: z.string().min(2, 'Source name is required'),
  sourceUrl: z.string().url('Source URL must be a valid URL'),
  organization: z.string().min(2, 'Organization is required'),
  documentType: z.string().min(2, 'Document type is required'),
  content: z.string().min(50, 'Document content must be at least 50 characters long'),
  locationScope: z.string().default('Telangana'),
  publicationDate: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
})

export type KnowledgeSearchInput = z.infer<typeof KnowledgeSearchSchema>
export type KnowledgeIngestInput = z.infer<typeof KnowledgeIngestSchema>
