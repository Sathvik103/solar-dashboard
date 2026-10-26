import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/dal/users'
import { runSolarAgent } from '@/lib/agent/orchestrator'
import {
  createConversation,
  addConversationMessage,
} from '@/lib/dal/conversations'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
  conversationId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to use the Solar Agent' }, { status: 401 })
  }

  const limit = await checkRateLimit(`chat:${user.id}`, 20, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parse = ChatRequestSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 })
  }

  const { message, conversationId: existingConvId } = parse.data

  try {
    let activeConversationId = existingConvId

    // If user is authenticated and no conversation ID given, create one
    if (!activeConversationId) {
      const summaryTitle = message.slice(0, 35) + (message.length > 35 ? '...' : '')
      const newConv = await createConversation(summaryTitle)
      activeConversationId = newConv.id
    }

    // Record user message if authenticated
    if (activeConversationId) {
      await addConversationMessage(activeConversationId, 'user', message)
    }

    // Run Solar Agent Orchestrator
    const agentResult = await runSolarAgent(message, {
      userId: user.id,
      conversationId: activeConversationId,
    })

    // Record assistant response if authenticated
    if (activeConversationId) {
      await addConversationMessage(activeConversationId, 'assistant', agentResult.answer, {
        citations: agentResult.citations,
        toolCalls: agentResult.toolsUsed,
        traceEvents: agentResult.traceEvents,
      })
    }

    return NextResponse.json({
      conversationId: activeConversationId || null,
      answer: agentResult.answer,
      citations: agentResult.citations,
      traceEvents: agentResult.traceEvents,
      toolsUsed: agentResult.toolsUsed,
      intent: agentResult.intent,
      verificationStatus: agentResult.verificationStatus,
      durationMs: agentResult.durationMs,
    })
  } catch (error) {
    console.error('[api/chat] agent failure', error)
    return NextResponse.json(
      { error: 'The Solar Agent hit an unexpected error. Please try again.' },
      { status: 500 }
    )
  }
}
