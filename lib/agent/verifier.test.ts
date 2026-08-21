import { describe, it, expect } from 'vitest'
import { verifyAgentResponse } from './verifier'

describe('Agent Response Verifier', () => {
  it('passes verified responses grounded in citations and tool outputs', () => {
    const candidate = 'A 3 kW rooftop solar system generates approx 375 kWh per month in Hyderabad.'
    const citations = [
      {
        id: 'c1',
        title: 'TGERC Rooftop Regulations',
        organization: 'TGERC',
        sourceUrl: 'https://tgerc.telangana.gov.in',
        documentType: 'Regulation',
        pageNumber: 5,
        sectionTitle: 'Net Metering',
        chunkIndex: 0,
        similarity: 0.82,
        snippet: 'Net metering is allowed up to 100% of sanctioned load.',
      },
    ]
    const tools = [
      {
        tool: 'calculateSolarOutput',
        input: { capacityKw: 3 },
        output: { monthlyGenerationKwh: 375 },
        durationMs: 5,
        success: true,
      },
    ]

    const res = verifyAgentResponse(candidate, citations, tools)
    expect(res.status).toBe('passed')
    expect(res.checksPassed.length).toBeGreaterThan(0)
  })

  it('adds safety disclaimer when ungrounded regulatory claims are detected', () => {
    const candidate = 'You will definitely get a 50% state subsidy from TSSPDCL for your net metering system.'
    const res = verifyAgentResponse(candidate, [], [])

    expect(res.status).toBe('revised')
    expect(res.disclaimersAdded.length).toBeGreaterThan(0)
    expect(res.verifiedAnswer).toContain('TSSPDCL')
  })
})
