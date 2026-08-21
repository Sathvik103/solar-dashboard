import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import { requireUser } from './users'

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
  citations: any[]
  toolCalls: any[]
  traceEvents: any[]
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
    role: m.role as any,
    content: m.content,
    citations: (m.citations as any) || [],
    toolCalls: (m.tool_calls as any) || [],
    traceEvents: (m.trace_events as any) || [],
    createdAt: m.created_at,
  }))
}

/**
 * Appends a message to a conversation.
 */
export async function addConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  extra: { citations?: any[]; toolCalls?: any[]; traceEvents?: any[] } = {}
): Promise<void> {
  const user = await requireUser()
  const supabase = await createSupabaseServerClient()

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role,
    content,
    citations: extra.citations || [],
    tool_calls: extra.toolCalls || [],
    trace_events: extra.traceEvents || [],
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
