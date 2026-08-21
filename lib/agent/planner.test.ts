import { describe, it, expect } from 'vitest'
import { planAgentExecution } from './planner'

describe('Agent Execution Planner', () => {
  it('classifies full solar proposal inquiry into full_solar_plan intent', () => {
    const plan = planAgentExecution('What system should I install on my roof in Hyderabad?', {
      monthlyUnitsKwh: 400,
      roofAreaSqft: 1000,
    })

    expect(plan.intent).toBe('full_solar_plan')
    expect(plan.toolsToExecute.some((t) => t.toolName === 'createSolarPlan')).toBe(true)
  })

  it('classifies system comparison inquiry into compare_options intent', () => {
    const plan = planAgentExecution('Compare 3kW vs 5kW solar system for my house', {
      monthlyUnitsKwh: 350,
    })

    expect(plan.intent).toBe('compare_options')
    expect(plan.toolsToExecute.some((t) => t.toolName === 'compareSystems')).toBe(true)
  })

  it('classifies financial question and schedules cost & savings tools', () => {
    const plan = planAgentExecution('How much does a 5kW solar system cost and what is the payback?', {
      monthlyUnitsKwh: 500,
    })

    expect(plan.intent).toBe('financial_roi')
    const toolNames = plan.toolsToExecute.map((t) => t.toolName)
    expect(toolNames).toContain('calculateSystemCost')
    expect(toolNames).toContain('calculateSolarOutput')
    expect(toolNames).toContain('calculateSavings')
  })

  it('classifies application procedure inquiries', () => {
    const plan = planAgentExecution('What is the step by step process to apply with TSSPDCL?')
    expect(plan.intent).toBe('application_guide')
    expect(plan.retrievalQuery).toContain('TSSPDCL')
  })
})
