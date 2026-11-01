'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Citation } from '@/lib/ai/citations'
import type { TraceEvent, ToolExecutionRecord } from '@/lib/agent/types'

export type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  traceEvents?: TraceEvent[]
  toolsUsed?: ToolExecutionRecord[]
  failed?: boolean
}

export type ConversationSummary = { id: string; title: string; updatedAt: string }

type AssistantContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  /** Opens the drawer and sends `question` immediately. */
  ask: (question: string) => void
  send: (text: string) => Promise<void>
  messages: AssistantMessage[]
  pending: boolean
  conversations: ConversationSummary[]
  conversationId: string | undefined
  selectConversation: (id: string | undefined) => void
  deleteConversation: (id: string) => Promise<void>
  refreshConversations: () => Promise<void>
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant must be used inside <AssistantProvider>')
  return ctx
}

type ApiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  traceEvents?: TraceEvent[]
  toolCalls?: ToolExecutionRecord[]
}

export default function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [pending, setPending] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const loadedFor = useRef<string | undefined>(undefined)
  const pendingRef = useRef(false)

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { conversations?: ConversationSummary[] }
      setConversations(data.conversations ?? [])
    } catch {
      // The list is a convenience; the drawer still works without it.
    }
  }, [])

  // Load the conversation list the first time the drawer opens.
  useEffect(() => {
    if (open && conversations.length === 0) void refreshConversations()
  }, [open, conversations.length, refreshConversations])

  const selectConversation = useCallback(async (id: string | undefined) => {
    setConversationId(id)
    loadedFor.current = id
    if (!id) {
      setMessages([])
      return
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { messages?: ApiMessage[] }
      if (loadedFor.current !== id) return
      setMessages(
        (data.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          traceEvents: m.traceEvents,
          toolsUsed: m.toolCalls,
        }))
      )
    } catch {
      setMessages([{ id: 'load-error', role: 'assistant', content: 'This conversation could not be loaded.', failed: true }])
    }
  }, [])

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || pendingRef.current) return
      pendingRef.current = true
      setPending(true)
      const userMsg: AssistantMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
      setMessages((prev) => [...prev, userMsg])

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, conversationId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'The assistant could not answer right now.')

        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId)
          loadedFor.current = data.conversationId
          void refreshConversations()
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.answer,
            citations: data.citations ?? [],
            traceEvents: data.traceEvents ?? [],
            toolsUsed: data.toolsUsed ?? [],
          },
        ])
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
            failed: true,
          },
        ])
      } finally {
        pendingRef.current = false
        setPending(false)
      }
    },
    [conversationId, refreshConversations]
  )

  const ask = useCallback(
    (question: string) => {
      setOpen(true)
      void send(question)
    },
    [send]
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (conversationId === id) {
        setConversationId(undefined)
        setMessages([])
      }
    },
    [conversationId]
  )

  // Ctrl/Cmd + J toggles the drawer; Escape closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo<AssistantContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((o) => !o),
      ask,
      send,
      messages,
      pending,
      conversations,
      conversationId,
      selectConversation,
      deleteConversation,
      refreshConversations,
    }),
    [open, ask, send, messages, pending, conversations, conversationId, selectConversation, deleteConversation, refreshConversations]
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}
