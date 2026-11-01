import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'
import type { Json } from '@/lib/types/supabase'

export type ConversationRecord = {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type MessageRecord = {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  citations: unknown[]
  toolCalls: unknown[]
  traceEvents: unknown[]
  artifacts: unknown[]
  suggestions: string[]
  createdAt: string
}

/**
 * Lists all conversations belonging to the authenticated user.
 */
export async function listUserConversations(): Promise<ConversationRecord[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return data.map((c) => ({
    id: c.id,
    userId: c.user_id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }))
}

/**
 * Creates a new conversation.
 */
export async function createConversation(title = 'New Solar Consultation'): Promise<ConversationRecord> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Fetches all messages in a conversation.
 */
export async function getConversationMessages(conversationId: string): Promise<MessageRecord[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    userId: m.user_id,
    role: m.role as MessageRecord['role'],
    content: m.content,
    citations: (m.citations as unknown[] | null) || [],
    toolCalls: (m.tool_calls as unknown[] | null) || [],
    traceEvents: (m.trace_events as unknown[] | null) || [],
    artifacts: (m.artifacts as unknown[] | null) || [],
    suggestions: (m.suggestions as string[] | null) || [],
    createdAt: m.created_at,
  }))
}

/** The last `limit` user/assistant messages of a conversation, oldest first (model memory). */
export async function getRecentHistory(
  conversationId: string,
  limit = 6
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? [])
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

/**
 * Appends a message to a conversation.
 */
export async function addConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  extra: { citations?: unknown[]; toolCalls?: unknown[]; traceEvents?: unknown[]; artifacts?: unknown[]; suggestions?: string[] } = {}
): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role,
    content,
    citations: (extra.citations || []) as Json,
    tool_calls: (extra.toolCalls || []) as Json,
    trace_events: (extra.traceEvents || []) as Json,
    artifacts: (extra.artifacts || []) as Json,
    suggestions: (extra.suggestions || []) as Json,
  })

  // Update conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

/**
 * Deletes a conversation and its messages (via ON DELETE CASCADE).
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  await supabase.from('conversations').delete().eq('id', conversationId).eq('user_id', user.id)
}
