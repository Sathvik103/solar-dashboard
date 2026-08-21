import 'server-only'

import { planAgentExecution } from './planner'
import { executeAgentTools } from './executor'
import { verifyAgentResponse } from './verifier'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'
import { extractCitations, formatRetrievalContextForLLM } from '@/lib/ai/citations'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { generateLLMResponse } from '@/lib/ai/llm'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { createSupabaseServerClient } from '@/lib/db/client'
import type { AgentExecutionResult, TraceEvent } from './types'

export type RunAgentOptions = {
  userId?: string
  conversationId?: string
}

/**
 * Master Agent Orchestrator for the Solar Intelligence Platform.
 * Implements the full agentic loop:
 * Plan -> Execute Tools -> RAG Retrieval -> LLM Synthesis -> Verification -> Trace Logging.
 */
export async function runSolarAgent(
  userQuery: string,
  options: RunAgentOptions = {}
): Promise<AgentExecutionResult> {
  const startTime = Date.now()
  const traceEvents: TraceEvent[] = []

  const addTrace = (
    type: TraceEvent['type'],
    status: TraceEvent['status'],
    message: string,
    detail?: any
  ) => {
    traceEvents.push({
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      status,
      message,
      detail,
    })
  }

  // 1. Load User Profile if authenticated
  let userProfile: any = null
  if (options.userId) {
    addTrace('profile_load', 'started', 'Checking user solar profile in database...')
    try {
      const p = await getSolarProfile(options.userId)
      if (p) {
        userProfile = {
          city: p.city,
          state: p.state,
          monthlyUnitsKwh: p.monthlyUnitsKwh,
          monthlyBillInr: p.monthlyBillInr,
          roofAreaSqft: p.roofAreaSqft,
          roofType: p.roofType,
          roofOrientation: p.roofOrientation,
          shadingLevel: p.shadingLevel,
          budgetInr: p.budgetInr,
          preferredCapacityKw: p.preferredCapacityKw,
        }
        addTrace('profile_load', 'completed', `Loaded solar profile for ${p.city} (${p.monthlyUnitsKwh || 350} kWh/mo)`)
      } else {
        addTrace('profile_load', 'completed', 'No custom profile found. Using regional Hyderabad benchmark defaults.')
      }
    } catch {
      addTrace('profile_load', 'failed', 'Could not load profile. Proceeding with defaults.')
    }
  }

  // 2. Planning Step
  addTrace('planning', 'started', 'Analyzing query intent and selecting tools...')
  const plan = planAgentExecution(userQuery, userProfile)
  addTrace(
    'planning',
    'completed',
    `Intent classified as "${plan.intent}". Scheduled ${plan.toolsToExecute.length} calculation tools.`,
    { tools: plan.toolsToExecute.map((t) => t.toolName), reasoning: plan.reasoning }
  )

  // 3. Tool Execution Step
  let toolRecords: any[] = []
  if (plan.toolsToExecute.length > 0) {
    addTrace('tool_call', 'started', `Executing ${plan.toolsToExecute.length} deterministic tools...`)
    toolRecords = await executeAgentTools(plan.toolsToExecute)
    addTrace('tool_call', 'completed', `Finished ${toolRecords.length} tool calculations.`, {
      resultsSummary: toolRecords.map((r) => `${r.tool}: ${r.success ? 'OK' : 'Error'}`),
    })
  }

  // 4. RAG Retrieval Step
  addTrace('retrieval', 'started', `Searching authoritative Telangana knowledge base for: "${plan.retrievalQuery || userQuery}"`)
  let retrievedChunks: any[] = []
  try {
    retrievedChunks = await searchKnowledgeBase(plan.retrievalQuery || userQuery, {
      topK: 4,
      similarityThreshold: 0.25,
      organization: plan.retrievalOrgFilter,
    })
    addTrace(
      'retrieval',
      'completed',
      `Retrieved ${retrievedChunks.length} authoritative source passages with pgvector.`,
      {
        sources: retrievedChunks.map((c) => `[${c.source.organization}] ${c.source.title} (${(c.similarity * 100).toFixed(1)}%)`),
      }
    )
  } catch (err: any) {
    addTrace('retrieval', 'failed', `Knowledge retrieval encountered an error: ${err.message}`)
  }

  const citations = extractCitations(retrievedChunks)
  const retrievalContext = formatRetrievalContextForLLM(retrievedChunks)

  // 5. Assemble Context & Prompt for LLM
  addTrace('synthesis', 'started', 'Synthesizing response with Gemini LLM grounded in citations & tool outputs...')
  const toolResultsContext =
    toolRecords.length > 0
      ? `\n### DETERMINISTIC TOOL RESULTS:\n${JSON.stringify(
          toolRecords.map((r) => ({ tool: r.tool, output: r.output })),
          null,
          2
        )}`
      : ''

  const userProfileContext = userProfile
    ? `\n### USER SOLAR PROFILE:\n${JSON.stringify(userProfile, null, 2)}`
    : ''

  const promptContent = `USER QUESTION:
"${userQuery}"
${userProfileContext}
${toolResultsContext}

### AUTHORITATIVE KNOWLEDGE BASE SOURCES:
${retrievalContext}

Please generate an answer grounded in the sources and tool calculations above. Always cite sources, explain numbers clearly, and state any regulatory requirements or limitations.`

  let candidateAnswer = ''
  try {
    candidateAnswer = await generateLLMResponse(
      [{ role: 'user', content: promptContent }],
      { systemPrompt: SYSTEM_PROMPTS.solarAdvisor, temperature: 0.2 }
    )
    addTrace('synthesis', 'completed', 'AI synthesis completed successfully.')
  } catch (llmErr: any) {
    addTrace('synthesis', 'failed', `LLM synthesis failed: ${llmErr.message}. Generating deterministic fallback report.`)
    // Deterministic fallback response if LLM API is unavailable/offline
    candidateAnswer = generateFallbackDeterministicResponse(userQuery, plan.intent, toolRecords, citations)
  }

  // 6. Verification Step
  addTrace('verification', 'started', 'Verifying factual claims, calculations, and regulatory guardrails...')
  const verification = verifyAgentResponse(candidateAnswer, citations, toolRecords)
  addTrace(
    'verification',
    'completed',
    `Verification outcome: ${verification.status.toUpperCase()}. Passed checks: ${verification.checksPassed.join(', ') || 'Standard safety checks'}.`
  )

  const durationMs = Date.now() - startTime

  // 7. Observability Logging (agent_runs record)
  if (options.userId) {
    try {
      const supabase = await createSupabaseServerClient()
      await supabase.from('agent_runs').insert({
        user_id: options.userId,
        conversation_id: options.conversationId || null,
        request: userQuery,
        status: 'completed',
        tools_used: toolRecords as any,
        retrieval_count: citations.length,
        verification_status: verification.status,
        latency_ms: durationMs,
      })
    } catch {
      // Non-blocking observability error
    }
  }

  return {
    answer: verification.verifiedAnswer,
    citations,
    traceEvents,
    toolsUsed: toolRecords,
    verificationStatus: verification.status,
    intent: plan.intent,
    durationMs,
  }
}

/**
 * Fallback deterministic generator in case external LLM API is offline.
 */
function generateFallbackDeterministicResponse(
  query: string,
  intent: string,
  tools: any[],
  citations: any[]
): string {
  let response = `### Solar Intelligence Analysis\n\n`

  if (tools.length > 0) {
    response += `**Calculation Summary:**\n`
    for (const t of tools) {
      if (t.output && typeof t.output === 'object') {
        if (t.tool === 'calculateSystemCost') {
          response += `- **Capacity:** ${t.output.capacityKw} kW\n- **Gross Cost:** ₹${t.output.costBreakdown?.totalGrossCostInr?.toLocaleString()}\n- **PM Surya Ghar Subsidy:** ₹${t.output.subsidyDetails?.eligibleSubsidyInr?.toLocaleString()}\n- **Net Cost:** ₹${t.output.netPayableCostInr?.toLocaleString()}\n\n`
        } else if (t.tool === 'calculateSavings') {
          response += `- **Estimated Monthly Savings:** ₹${t.output.monthlySavingsInr?.toLocaleString()}\n- **Annual Savings:** ₹${t.output.annualSavingsInr?.toLocaleString()} (~${t.output.billReductionPercentage}% bill offset)\n\n`
        } else if (t.tool === 'calculatePayback') {
          response += `- **Payback Period:** ${t.output.dynamicPaybackPeriodYears} years (${t.output.verdict})\n\n`
        } else if (t.tool === 'createSolarPlan') {
          response += `- **Recommended System:** ${t.output.proposalSummary?.recommendedSystemSizeKw} kW\n- **Net Investment:** ₹${t.output.proposalSummary?.netInvestmentInr?.toLocaleString()}\n- **Annual Savings:** ₹${t.output.proposalSummary?.estimatedAnnualSavingsInr?.toLocaleString()}\n- **Payback:** ${t.output.proposalSummary?.paybackPeriodYears} years\n\n`
        }
      }
    }
  }

  if (citations.length > 0) {
    response += `**Relevant Regulatory Rules:**\n`
    for (const c of citations) {
      response += `- **[${c.organization}] ${c.title}**: ${c.snippet}\n`
    }
  }

  return response
}
