import type { Citation } from '@/lib/ai/citations'

export type UserIntent =
  | 'general_question'
  | 'regulatory_inquiry'
  | 'system_sizing'
  | 'financial_roi'
  | 'compare_options'
  | 'application_guide'
  | 'full_solar_plan'

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
}
