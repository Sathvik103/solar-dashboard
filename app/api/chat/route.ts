import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/dal/users'
import { runSolarAgent } from '@/lib/agent/orchestrator'
import {
  createConversation,
  addConversationMessage,
} from '@/lib/dal/conversations'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()

  let body: any
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
    if (user && !activeConversationId) {
      const summaryTitle = message.slice(0, 35) + (message.length > 35 ? '...' : '')
      const newConv = await createConversation(summaryTitle)
      activeConversationId = newConv.id
    }

    // Record user message if authenticated
    if (user && activeConversationId) {
      await addConversationMessage(activeConversationId, 'user', message)
    }

    // Run Solar Agent Orchestrator
    const agentResult = await runSolarAgent(message, {
      userId: user?.id,
      conversationId: activeConversationId,
    })

    // Record assistant response if authenticated
    if (user && activeConversationId) {
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Solar agent execution encountered an unexpected error.' },
      { status: 500 }
    )
  }
}
