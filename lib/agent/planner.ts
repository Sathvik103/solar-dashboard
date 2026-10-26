import type { UserIntent } from './types'

export type PlannerProfile = {
  monthlyUnitsKwh?: number | null
  monthlyBillInr?: number | null
  roofAreaSqft?: number | null
  preferredCapacityKw?: number | null
  city?: string | null
}

export type ExecutionPlan = {
  intent: UserIntent
  toolsToExecute: {
    toolName: string
    params: Record<string, unknown>
  }[]
  retrievalQuery?: string
  /** Inputs the plan needs but the user profile lacks; the assistant must ask for them. */
  missingInputs: string[]
  reasoning: string
}

/**
 * Deterministic intent classifier & tool planner.
 * Evaluates the query to select the optimal combination of tools and retrieval queries.
 */
export function planAgentExecution(
  query: string,
  userProfile?: PlannerProfile | null
): ExecutionPlan {
  const lower = query.toLowerCase()
  const tools: { toolName: string; params: Record<string, unknown> }[] = []
  let intent: UserIntent = 'general_question'
  let retrievalQuery: string | undefined = query

  const monthlyUnits = userProfile?.monthlyUnitsKwh ?? null
  const roofArea = userProfile?.roofAreaSqft ?? undefined
  const missingUnits =
    monthlyUnits == null ? ['monthlyUnitsKwh (ask for their monthly units, or to fill their solar profile)'] : []

  // 1. Check for Full Plan Request
  if (
    lower.includes('full plan') ||
    lower.includes('complete proposal') ||
    lower.includes('should i install') ||
    lower.includes('what should i get') ||
    (lower.includes('recommend') && lower.includes('system'))
  ) {
    intent = 'full_solar_plan'
    if (monthlyUnits != null) {
      tools.push({
        toolName: 'createSolarPlan',
        params: {
          monthlyUnitsKwh: monthlyUnits,
          monthlyBillInr: userProfile?.monthlyBillInr ?? undefined,
          roofAreaSqft: roofArea,
          city: userProfile?.city || 'Hyderabad',
        },
      })
    }
    retrievalQuery = 'Telangana rooftop solar net metering subsidy guidelines PM Surya Ghar'
    return {
      intent,
      toolsToExecute: tools,
      retrievalQuery,
      missingInputs: missingUnits,
      reasoning: 'User requested comprehensive solar recommendation. Planned createSolarPlan tool + policy retrieval.',
    }
  }

  // 2. Check for Comparison Request (e.g. 3kW vs 5kW)
  if (
    lower.includes('vs') ||
    lower.includes('compare') ||
    lower.includes('difference between') ||
    (lower.includes('3kw') && lower.includes('5kw'))
  ) {
    intent = 'compare_options'
    if (monthlyUnits != null) {
      tools.push({
        toolName: 'compareSystems',
        params: {
          monthlyUnitsKwh: monthlyUnits,
          roofAreaSqft: roofArea,
          capacitiesToCompare: [2, 3, 5, 7, 10],
        },
      })
    }
    retrievalQuery = 'Telangana rooftop solar capacity limits subsidy comparison PM Surya Ghar'
    return {
      intent,
      toolsToExecute: tools,
      retrievalQuery,
      missingInputs: missingUnits,
      reasoning: 'User asked to compare system configurations. Scheduled compareSystems tool.',
    }
  }

  // 3. Check for Financial / Cost / Subsidy / Payback / Savings
  if (
    lower.includes('cost') ||
    lower.includes('price') ||
    lower.includes('subsidy') ||
    lower.includes('savings') ||
    lower.includes('payback') ||
    lower.includes('roi') ||
    lower.includes('bill') ||
    lower.includes('tariff')
  ) {
    intent = 'financial_roi'

    // Extract capacity if specified (e.g. "5kw", "3 kw")
    const capMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kw|kilowatt)/i)
    const capacityKw = capMatch ? parseFloat(capMatch[1]) : (userProfile?.preferredCapacityKw ?? null)
    const missing = [...missingUnits]
    if (capacityKw == null) missing.push('capacityKw (ask which system size, e.g. 3 kW or 5 kW)')

    if (capacityKw != null) {
      tools.push({
        toolName: 'calculateSystemCost',
        params: { capacityKw, batteryStorage: lower.includes('battery') },
      })

      // Reference Hyderabad assumptions: ~4.8 peak sun hours/day, ~125 kWh per kW per month.
      tools.push({
        toolName: 'calculateSolarOutput',
        params: { capacityKw, dailySunlightHours: 4.8 },
      })

      if (monthlyUnits != null) {
        tools.push({
          toolName: 'calculateSavings',
          params: {
            monthlyGenerationKwh: Math.round(capacityKw * 125),
            monthlyConsumptionKwh: monthlyUnits,
          },
        })
      }
    }

    retrievalQuery = `${query} Telangana subsidy CFA net metering rate`
    return {
      intent,
      toolsToExecute: tools,
      retrievalQuery,
      missingInputs: missing,
      reasoning: 'User asked for financial/economic analysis. Scheduled cost, generation, and savings calculation tools.',
    }
  }

  // 4. Check for Application Process / DISCOM / Documents
  if (
    lower.includes('process') ||
    lower.includes('apply') ||
    lower.includes('application') ||
    lower.includes('documents') ||
    lower.includes('portal') ||
    lower.includes('discom') ||
    lower.includes('inspection') ||
    lower.includes('tssouthernpower') ||
    lower.includes('tsspdcl') ||
    lower.includes('tgredco')
  ) {
    intent = 'application_guide'
    retrievalQuery = `${query} application documents procedure TSSPDCL TGREDCO`
    return {
      intent,
      toolsToExecute: tools,
      retrievalQuery,
      missingInputs: [],
      reasoning: 'User asked about application or DISCOM approval workflow. Focused on procedure knowledge retrieval.',
    }
  }

  // 5. Regulatory / Net Metering Questions
  if (
    lower.includes('rule') ||
    lower.includes('regulation') ||
    lower.includes('net meter') ||
    lower.includes('gross meter') ||
    lower.includes('group') ||
    lower.includes('virtual') ||
    lower.includes('tgerc')
  ) {
    intent = 'regulatory_inquiry'
    retrievalQuery = `${query} TGERC regulations`
    return {
      intent,
      toolsToExecute: tools,
      retrievalQuery,
      missingInputs: [],
      reasoning: 'User asked a regulatory/policy question. Planned TGERC legal retrieval.',
    }
  }

  // Default: General knowledge search
  return {
    intent: 'general_question',
    toolsToExecute: tools,
    retrievalQuery: query,
    missingInputs: [],
    reasoning: 'General solar inquiry. Executing knowledge base search.',
  }
}
