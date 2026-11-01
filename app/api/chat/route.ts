import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/dal/users'
import { runSolarAgent } from '@/lib/agent/orchestrator'
import { createConversation, addConversationMessage, getRecentHistory } from '@/lib/dal/conversations'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'
import { readJson } from '@/lib/http'

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
  conversationId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in to use the assistant' }, { status: 401 })

  const limit = await enforce('chat', user.id)
  if (!limit.allowed) return tooManyRequests(limit, 'You are sending messages too quickly. Please wait a moment.')
  const headers = rateLimitHeaders(limit)

  const body = await readJson(request, ChatRequestSchema, 8 * 1024, headers)
  if (!body.ok) return body.response
  const { message, conversationId: existing } = body.data

  try {
    // Every conversation and message is stored, so history survives reloads and devices.
    const conversationId =
      existing ?? (await createConversation(message.slice(0, 60) + (message.length > 60 ? '…' : ''))).id
    const history = existing ? await getRecentHistory(existing, 6) : []
    await addConversationMessage(conversationId, 'user', message)

    const result = await runSolarAgent(message, { userId: user.id, conversationId, history })

    await addConversationMessage(conversationId, 'assistant', result.answer, {
      citations: result.citations,
      toolCalls: result.toolsUsed,
      traceEvents: result.traceEvents,
      artifacts: result.artifacts,
      suggestions: result.suggestions,
    })

    return NextResponse.json(
      {
        conversationId,
        answer: result.answer,
        citations: result.citations,
        traceEvents: result.traceEvents,
        toolsUsed: result.toolsUsed,
        artifacts: result.artifacts,
        suggestions: result.suggestions,
        source: result.source,
        intent: result.intent,
        verificationStatus: result.verificationStatus,
        durationMs: result.durationMs,
      },
      { headers }
    )
  } catch (error) {
    console.error('[api/chat] agent failure', error)
    return NextResponse.json({ error: 'The assistant hit an unexpected error. Please try again.' }, { status: 500, headers })
  }
}
