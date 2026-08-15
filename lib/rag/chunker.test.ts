import { describe, it, expect } from 'vitest'
import { chunkDocument, estimateTokenCount } from './chunker'

describe('RAG Chunker & Token Estimator', () => {
  it('estimates token count accurately based on length', () => {
    const text = 'Hello solar world! This is a test.'
    const tokens = estimateTokenCount(text)
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBe(Math.ceil(text.length / 4))
  })

  it('splits document into structure-aware chunks', () => {
    const doc = `
# SECTION 1: NET METERING
Net metering is a billing mechanism that credits solar energy system owners for the electricity they add to the grid.

# SECTION 2: CAPACITY LIMITS
The capacity of a Rooftop Solar PV System to be installed shall not exceed 100% of sanctioned load.
`
    const chunks = chunkDocument(doc, { maxChunkSize: 300, minChunkSize: 50 })
    expect(chunks.length).toBeGreaterThanOrEqual(2)

    expect(chunks[0].chunkIndex).toBe(0)
    expect(chunks[0].content).toContain('NET METERING')
    expect(chunks[0].sectionTitle).toBe('SECTION 1: NET METERING')

    expect(chunks[1].chunkIndex).toBe(1)
    expect(chunks[1].content).toContain('CAPACITY LIMITS')
    expect(chunks[1].sectionTitle).toBe('SECTION 2: CAPACITY LIMITS')
  })

  it('preserves page numbers when page markers exist', () => {
    const doc = `
--- Page 1 ---
TGERC Rooftop Solar Regulations Overview.

--- Page 2 ---
Net excess energy is carried forward to subsequent billing cycles.
`
    const chunks = chunkDocument(doc, { maxChunkSize: 200 })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].pageNumber).toBe(1)
  })
})
