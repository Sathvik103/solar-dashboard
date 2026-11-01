import { describe, it, expect } from 'vitest'
import { deterministicAnswer } from './deterministic'
import { buildArtifacts, suggestionsFor } from './artifacts'
import { planAgentExecution } from './planner'
import { calculateSystemCostTool } from './tools/calculateSystemCost'
import { getTariffInformationTool } from './tools/getTariffInformation'

const record = (tool: string, output: unknown) => ({ tool, input: {}, output, durationMs: 1, success: true })

describe('deterministic answers', () => {
  it('answers a plain subsidy question exactly, without the model', async () => {
    const cost = await calculateSystemCostTool({ capacityKw: 2.5, batteryStorage: false })
    const a = deterministicAnswer('How much subsidy for a 2.5 kW system?', 'financial_roi', [record('calculateSystemCost', cost)])
    expect(a).toContain('₹69,000')
  })

  it('answers a bill question from the slab calculator', async () => {
    const t = await getTariffInformationTool({ monthlyUnitsKwh: 450, category: 'domestic' })
    const a = deterministicAnswer('What is the bill for 450 units?', 'financial_roi', [record('getTariffInformation', t)])
    expect(a).toContain('LT-I(C)')
  })

  it('defers compound questions to the model', async () => {
    const cost = await calculateSystemCostTool({ capacityKw: 3, batteryStorage: false })
    expect(deterministicAnswer('How much subsidy for 3 kW and how do I apply?', 'financial_roi', [record('calculateSystemCost', cost)])).toBeNull()
  })
})

describe('planner extensions', () => {
  it('routes questions about the user’s own data to the energy summary without retrieval', () => {
    const p = planAgentExecution('How did my system perform this month?')
    expect(p.intent).toBe('my_energy')
    expect(p.toolsToExecute[0].toolName).toBe('getEnergySummary')
    expect(p.retrievalQuery).toBeUndefined()
  })

  it('resolves short follow-ups against the previous question', () => {
    const p = planAgentExecution('what about 5 kw?', { monthlyUnitsKwh: 400 }, 'How much does a 3 kW system cost?')
    expect(p.intent).toBe('financial_roi')
    expect(p.toolsToExecute.find((t) => t.toolName === 'calculateSystemCost')?.params.capacityKw).toBe(5)
  })
})

describe('artifacts', () => {
  it('builds a cost table and bill chart from tool outputs only', async () => {
    const cost = await calculateSystemCostTool({ capacityKw: 3, batteryStorage: false })
    const arts = buildArtifacts([record('calculateSystemCost', cost)])
    expect(arts[0]).toMatchObject({ type: 'table', id: 'cost-breakdown' })
    expect(suggestionsFor('my_energy').length).toBeGreaterThan(0)
  })
})
