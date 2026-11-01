import type { Citation } from '@/lib/ai/citations'
import type { Artifact } from './artifacts'

export type UserIntent =
  | 'general_question'
  | 'regulatory_inquiry'
  | 'system_sizing'
  | 'financial_roi'
  | 'compare_options'
  | 'application_guide'
  | 'full_solar_plan'
  | 'my_energy'
  | 'net_metering_credit'

export type TraceEventType =
  | 'intent_detection'
  | 'planning'
  | 'profile_load'
  | 'retrieval'
  | 'tool_call'
  | 'calculation'
  | 'verification'
  | 'synthesis'

export type TraceEvent = {
  id: string
  timestamp: string
  type: TraceEventType
  status: 'started' | 'completed' | 'failed'
  message: string
  detail?: any
}

export type ToolExecutionRecord = {
  tool: string
  input: any
  output: any
  durationMs: number
  success: boolean
}

export type AgentExecutionResult = {
  answer: string
  citations: Citation[]
  traceEvents: TraceEvent[]
  toolsUsed: ToolExecutionRecord[]
  verificationStatus: 'passed' | 'revised' | 'unverified'
  intent: UserIntent
  durationMs: number
  artifacts: Artifact[]
  suggestions: string[]
  /** Which step produced the answer; only 'model' consumed language-model budget. */
  source: 'guardrail' | 'deterministic' | 'cache' | 'model' | 'budget' | 'fallback'
}
