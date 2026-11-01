import 'server-only'

import { planAgentExecution, type PlannerProfile } from './planner'
import { executeAgentTools } from './executor'
import { verifyAgentResponse } from './verifier'
import { checkInput, checkOutput } from './guardrails'
import { buildArtifacts, suggestionsFor, type Artifact } from './artifacts'
import { deterministicAnswer } from './deterministic'
import { getBudget, recordUsage } from './budget'
import { cacheKey, getCachedAnswer, putCachedAnswer } from './cache'
import { searchKnowledgeBase } from '@/lib/rag/retrieval'
import { extractCitations, formatRetrievalContextForLLM, type Citation } from '@/lib/ai/citations'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { generateWithUsage, type LLMMessage } from '@/lib/ai/llm'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { createSupabaseServerClient } from '@/lib/db/client'
import type { RetrievalResult } from '@/lib/types/rag'
import type { Json } from '@/lib/types/supabase'
import type { AgentExecutionResult, ToolExecutionRecord, TraceEvent, UserIntent } from './types'
import { errorMessage } from '@/lib/utils'

export type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export type RunAgentOptions = {
  userId: string
  conversationId?: string
  /** Earlier turns of this conversation, oldest first. */
  history?: HistoryMessage[]
}

/** How many earlier messages the model sees, and how much of each. */
const HISTORY_MESSAGES = 6
const HISTORY_CHARS = 700

/** Intents that never need regulation documents (saves an embedding call per message). */
const NO_RETRIEVAL: UserIntent[] = ['my_energy']

/**
 * Assistant pipeline. Cheapest steps first; the language model is the last resort.
 *
 *   guardrails -> profile -> plan -> tools -> charts -> exact answers -> retrieval -> cache -> budget
 *   -> model (with conversation history) -> output checks -> verifier -> cache write -> run log
 */
export async function runSolarAgent(userQuery: string, options: RunAgentOptions): Promise<AgentExecutionResult> {
  const startTime = Date.now()
  const traceEvents: TraceEvent[] = []
  const trace = (type: TraceEvent['type'], status: TraceEvent['status'], message: string, detail?: unknown) =>
    traceEvents.push({ id: `t-${traceEvents.length}`, timestamp: new Date().toISOString(), type, status, message, detail })

  const history = (options.history ?? []).slice(-HISTORY_MESSAGES)

  const finish = (
    partial: Pick<AgentExecutionResult, 'answer' | 'source'> &
      Partial<Pick<AgentExecutionResult, 'citations' | 'toolsUsed' | 'artifacts' | 'suggestions' | 'intent' | 'verificationStatus'>>
  ): AgentExecutionResult => ({
    citations: [],
    toolsUsed: [],
    artifacts: [],
    suggestions: suggestionsFor(partial.intent ?? 'general_question'),
    intent: 'general_question',
    verificationStatus: 'passed',
    traceEvents,
    durationMs: Date.now() - startTime,
    ...partial,
  })

  // 1. Input guardrails: no model call for injection, off-topic or small talk.
  const verdict = checkInput(userQuery, { hasHistory: history.length > 0 })
  if (verdict.kind !== 'ok') {
    trace('intent_detection', 'completed', `Handled without the model (${verdict.kind.replace('_', ' ')}).`)
    return finish({ answer: verdict.reply, source: 'guardrail' })
  }

  // 2. Profile.
  let profile: (PlannerProfile & Record<string, unknown>) | null = null
  try {
    const p = await getSolarProfile(options.userId)
    if (p) {
      profile = {
        city: p.city,
        state: p.state,
        monthlyUnitsKwh: p.monthlyUnitsKwh,
        monthlyBillInr: p.monthlyBillInr,
        sanctionedLoadKw: p.sanctionedLoadKw,
        roofAreaSqft: p.roofAreaSqft,
        roofOrientation: p.roofOrientation,
        shadingLevel: p.shadingLevel,
        budgetInr: p.budgetInr,
        preferredCapacityKw: p.preferredCapacityKw,
      }
    }
    trace('profile_load', 'completed', p ? `Loaded profile for ${p.city}.` : 'No profile saved yet.')
  } catch {
    trace('profile_load', 'failed', 'Could not load the profile.')
  }

  // 3. Plan and run deterministic tools.
  const previousUser = [...history].reverse().find((m) => m.role === 'user')?.content
  const plan = planAgentExecution(userQuery, profile, previousUser)
  trace('planning', 'completed', `Intent: ${plan.intent.replace('_', ' ')}.`, { tools: plan.toolsToExecute.map((t) => t.toolName) })

  let toolRecords: ToolExecutionRecord[] = []
  if (plan.toolsToExecute.length) {
    toolRecords = await executeAgentTools(plan.toolsToExecute)
    trace('tool_call', 'completed', `Ran ${toolRecords.length} calculation(s).`)
  }
  const artifacts: Artifact[] = buildArtifacts(toolRecords)
  const suggestions = suggestionsFor(plan.intent)
  const base = { toolsUsed: toolRecords, artifacts, suggestions, intent: plan.intent }

  // 4. Exact answers for simple calculator questions (subsidy for N kW, bill for N units).
  const exact = deterministicAnswer(userQuery, plan.intent, toolRecords)
  if (exact) {
    trace('calculation', 'completed', 'Answered directly from the calculators; no model call.')
    return finish({ ...base, answer: exact, source: 'deterministic' })
  }

  // 5. Retrieval only when the answer can depend on regulations.
  let retrieved: RetrievalResult[] = []
  if (!NO_RETRIEVAL.includes(plan.intent)) {
    try {
      retrieved = await searchKnowledgeBase(plan.retrievalQuery || userQuery, { topK: 4, similarityThreshold: 0.35 })
      trace('retrieval', 'completed', `Found ${retrieved.length} relevant passage(s).`)
    } catch (err) {
      trace('retrieval', 'failed', `Document search failed: ${errorMessage(err)}`)
    }
  }
  const citations: Citation[] = extractCitations(retrieved)

  // 6. Context the model is allowed to use. Everything it states must come from here.
  const toolContext = toolRecords.map((r) => ({ tool: r.tool, output: r.output }))
  const context = [
    profile ? `USER PROFILE:\n${JSON.stringify(profile)}` : 'USER PROFILE: none saved',
    plan.missingInputs.length ? `MISSING INPUTS (ask for these, never assume them):\n- ${plan.missingInputs.join('\n- ')}` : '',
    toolContext.length ? `CALCULATIONS:\n${JSON.stringify(toolContext)}` : 'CALCULATIONS: none',
    `SOURCES:\n${retrieved.length ? formatRetrievalContextForLLM(retrieved) : 'No matching documents were found.'}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  // 7. Cache: identical question + identical context + same recent conversation.
  const key = cacheKey(userQuery, {
    context,
    history: history.map((m) => m.content.slice(0, 200)),
  })
  const cached = await getCachedAnswer(options.userId, key)
  if (cached) {
    trace('synthesis', 'completed', 'Reused an identical recent answer (cache).')
    return finish({ ...base, citations, answer: cached.answer, source: 'cache' })
  }

  // 8. Daily model budget.
  const budget = await getBudget(options.userId)
  if (budget.remaining <= 0) {
    trace('synthesis', 'completed', `Daily assistant limit reached (${budget.limit}).`)
    return finish({
      ...base,
      citations,
      answer: limitedAnswer(toolRecords, citations, budget.limit),
      source: 'budget',
      verificationStatus: 'unverified',
    })
  }

  // 9. Model call with recent conversation for follow-ups.
  const messages: LLMMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content.slice(0, HISTORY_CHARS) })),
    {
      role: 'user',
      content: `${context}\n\nQUESTION:\n${userQuery}\n\nAnswer using only the profile, calculations and sources above. If they do not cover the question, say so plainly.`,
    },
  ]

  let answer: string
  let source: AgentExecutionResult['source'] = 'model'
  try {
    const result = await generateWithUsage(messages, { systemPrompt: SYSTEM_PROMPTS.solarAdvisor, temperature: 0.2, maxTokens: 4096 })
    answer = result.text
    void recordUsage({
      userId: options.userId,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      outcome: 'ok',
    })
    trace('synthesis', 'completed', `Answer written by ${result.model} in ${result.latencyMs} ms.`)
  } catch (err) {
    void recordUsage({ userId: options.userId, model: 'chain', latencyMs: Date.now() - startTime, outcome: 'error' })
    trace('synthesis', 'failed', `Model unavailable: ${errorMessage(err)}`)
    answer = limitedAnswer(toolRecords, citations, null)
    source = 'fallback'
  }

  // 10. Output guardrails and regulatory verifier.
  const contextForCheck = `${context}\n${userQuery}\n${history.map((m) => m.content).join('\n')}`
  const checked = checkOutput(answer, contextForCheck)
  if (checked.untraced.length) trace('verification', 'completed', `Flagged ${checked.untraced.length} untraced amount(s).`)
  const verification = verifyAgentResponse(checked.answer, citations, toolRecords)
  trace('verification', 'completed', `Verification ${verification.status}.`)

  if (source === 'model' && checked.untraced.length === 0) {
    void putCachedAnswer(options.userId, key, verification.verifiedAnswer, { intent: plan.intent } as Json)
  }

  const result = finish({
    ...base,
    citations,
    answer: verification.verifiedAnswer,
    source,
    verificationStatus: checked.untraced.length ? 'revised' : verification.status,
  })

  // 11. Run log for observability (non-blocking).
  void (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      await supabase.from('agent_runs').insert({
        user_id: options.userId,
        conversation_id: options.conversationId ?? null,
        request: userQuery.slice(0, 2000),
        status: 'completed',
        tools_used: toolRecords.map((t) => ({ tool: t.tool, success: t.success, durationMs: t.durationMs })) as Json,
        retrieval_count: citations.length,
        verification_status: result.verificationStatus,
        latency_ms: result.durationMs,
      })
    } catch {
      // Observability must never break the answer.
    }
  })()

  return result
}

/** Answer built only from calculations and documents, used when the model is unavailable or over budget. */
function limitedAnswer(tools: ToolExecutionRecord[], citations: Citation[], dailyLimit: number | null): string {
  const lines: string[] = [
    dailyLimit != null
      ? `You have reached today's limit of ${dailyLimit} written answers, so this reply shows the calculated figures only. The limit resets at midnight.`
      : 'The writing model is unavailable right now, so this reply shows the calculated figures only.',
  ]
  for (const t of tools) {
    if (!t.success || !t.output || typeof t.output !== 'object') continue
    const o = t.output as Record<string, unknown>
    if (t.tool === 'calculateSystemCost') {
      lines.push(
        `- ${o.capacityKw} kW: net cost ₹${Number(o.netPayableCostInr).toLocaleString('en-IN')} after a ₹${Number((o.subsidyDetails as Record<string, unknown>)?.eligibleSubsidyInr).toLocaleString('en-IN')} subsidy.`
      )
    } else if (t.tool === 'calculateSavings') {
      lines.push(`- Saving about ₹${Number(o.monthlySavingsInr).toLocaleString('en-IN')} a month (₹${Number(o.annualSavingsInr).toLocaleString('en-IN')} a year).`)
    } else if (t.tool === 'createSolarPlan') {
      const s = o.proposalSummary as Record<string, unknown>
      lines.push(`- Recommended ${s?.recommendedSystemSizeKw} kW; payback about ${s?.paybackPeriodYears} years.`)
    } else if (t.tool === 'getEnergySummary') {
      lines.push(`- ${o.daysWithReadings} day(s) of readings, ${o.totalGenerationKwh} kWh generated in the last 30 days.`)
    }
  }
  if (citations.length) {
    lines.push('', 'Relevant documents:')
    for (const c of citations) lines.push(`- ${c.title} (${c.organization})`)
  }
  return lines.join('\n')
}
