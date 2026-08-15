import { describe, it, expect } from 'vitest'
import { KnowledgeSearchSchema, KnowledgeIngestSchema } from './knowledge'

describe('Knowledge Zod Schema Validations', () => {
  it('validates valid search query payload', () => {
    const payload = {
      query: 'What are the net metering rules in Telangana?',
      topK: 5,
      similarityThreshold: 0.5,
    }
    const result = KnowledgeSearchSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejects short search queries (<3 chars)', () => {
    const payload = { query: 'hi' }
    const result = KnowledgeSearchSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('validates valid document ingestion payload', () => {
    const payload = {
      title: 'TGERC Rooftop Solar Regulations',
      source: 'TGERC',
      sourceUrl: 'https://tgerc.telangana.gov.in/rules.pdf',
      organization: 'TGERC',
      documentType: 'Regulation',
      content: 'This document specifies official rooftop solar interactive systems regulations for Telangana State.',
    }
    const result = KnowledgeIngestSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejects invalid source URL in ingestion payload', () => {
    const payload = {
      title: 'Invalid URL Test',
      source: 'Test',
      sourceUrl: 'not-a-valid-url',
      organization: 'TestOrg',
      documentType: 'Test',
      content: 'Sample content string that meets the minimum length requirement for testing.',
    }
    const result = KnowledgeIngestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})
