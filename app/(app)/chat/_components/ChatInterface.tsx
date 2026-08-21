'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Cpu,
  Layers,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Citation } from '@/lib/ai/citations'
import type { TraceEvent, ToolExecutionRecord } from '@/lib/agent/types'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  traceEvents?: TraceEvent[]
  toolsUsed?: ToolExecutionRecord[]
  verificationStatus?: string
  createdAt?: string
}

type Conversation = {
  id: string
  title: string
  updatedAt: string
}

const SAMPLE_QUESTIONS = [
  'Should I install 3kW or 5kW solar on my house in Hyderabad?',
  'What subsidy do I get under PM Surya Ghar Muft Bijli Yojana?',
  'What are the net-metering regulations and capacity limits in Telangana?',
  'What is the step-by-step application process with TSSPDCL?',
  'How much can I save monthly with a 4 kW solar system?',
]

export default function ChatInterface({ initialConversationId }: { initialConversationId?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(initialConversationId)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [openTraces, setOpenTraces] = useState<Record<string, boolean>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId)
    } else {
      setMessages([])
    }
  }, [activeConversationId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch {
      // Offline fallback
    }
  }

  async function fetchMessages(convId: string) {
    try {
      const res = await fetch(`/api/conversations/${convId}`)
      const data = await res.json()
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations,
            traceEvents: m.traceEvents,
            toolsUsed: m.toolCalls,
          }))
        )
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleSendMessage(queryToSend?: string) {
    const text = (queryToSend || inputMessage).trim()
    if (!text || loading) return

    setInputMessage('')
    const tempUserMsgId = `temp-${Date.now()}`
    const newMsgList: Message[] = [...messages, { id: tempUserMsgId, role: 'user', content: text }]
    setMessages(newMsgList)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get agent response')
      }

      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId)
        fetchConversations()
      }

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        traceEvents: data.traceEvents || [],
        toolsUsed: data.toolsUsed || [],
        verificationStatus: data.verificationStatus,
      }

      setMessages([...newMsgList, assistantMsg])
      // Auto-open trace for inspection
      setOpenTraces((prev) => ({ ...prev, [assistantMsg.id]: true }))
    } catch (err: any) {
      setMessages([
        ...newMsgList,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error executing agent: ${err.message || 'Please check your connection and try again.'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE' })
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(undefined)
        setMessages([])
      }
    } catch {
      // Handle error
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      {/* Sidebar: Conversation History */}
      <div className="hidden md:flex flex-col gap-3 bg-card border rounded-xl p-4 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <span>Consultations</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            onClick={() => {
              setActiveConversationId(undefined)
              setMessages([])
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">No past consultations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-emerald-50 text-emerald-900 font-medium border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="truncate flex-1 pr-2">{conv.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                  title="Delete consultation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Grounded in official TGERC, TGREDCO & MNRE rules.</span>
        </div>
      </div>

      {/* Main Chat Stream Area */}
      <div className="md:col-span-3 flex flex-col bg-card border rounded-xl overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Solar Intelligence AI Advisor
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Telangana & Hyderabad
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Grounded RAG retrieval • Deterministic solar & financial tools • Formal verification
              </p>
            </div>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-10">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-800">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Ask the Solar Intelligence Agent</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6 leading-relaxed">
                Get accurate, verified solar planning guidance grounded in Telangana's net-metering regulations,
                TSSPDCL procedures, and PM Surya Ghar subsidy rates.
              </p>

              <div className="flex flex-col w-full gap-2 text-left">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Suggested Questions:
                </span>
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="p-3 text-xs rounded-lg border bg-background hover:bg-muted/60 transition-colors text-foreground text-left flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-muted/40 border rounded-tl-sm text-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  </div>

                  {/* Agent Execution Trace Panel (Assistant Only) */}
                  {msg.role === 'assistant' && msg.traceEvents && msg.traceEvents.length > 0 && (
                    <div className="border rounded-xl bg-card text-xs overflow-hidden">
                      <button
                        onClick={() =>
                          setOpenTraces((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                        }
                        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors font-medium text-muted-foreground"
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5 text-amber-600" />
                          <span>Agent Execution Trace ({msg.traceEvents.length} events)</span>
                          {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              {msg.toolsUsed.length} tools executed
                            </Badge>
                          )}
                        </div>
                        {openTraces[msg.id] ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {openTraces[msg.id] && (
                        <div className="p-3 space-y-2 border-t bg-muted/10 font-mono text-[11px]">
                          {msg.traceEvents.map((evt, idx) => (
                            <div key={evt.id || idx} className="flex items-start gap-2 text-muted-foreground">
                              {evt.status === 'completed' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : evt.status === 'failed' ? (
                                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                              )}
                              <div className="flex-1">
                                <span className="font-semibold text-foreground">[{evt.type.toUpperCase()}]</span>{' '}
                                {evt.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grounded Source Citations (Assistant Only) */}
                  {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-emerald-600" /> Grounded Source Citations ({msg.citations.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((c, idx) => (
                          <div
                            key={c.id || idx}
                            className="p-2.5 rounded-lg border bg-card text-xs flex flex-col justify-between gap-2 hover:border-emerald-500/50 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  {c.organization}
                                </Badge>
                                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                                  {(c.similarity * 100).toFixed(1)}% match
                                </span>
                              </div>
                              <p className="font-medium text-foreground line-clamp-1">{c.title}</p>
                              {c.sectionTitle && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  Section: {c.sectionTitle}
                                </p>
                              )}
                            </div>
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium pt-1 border-t"
                            >
                              Official Government Document <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 border">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 items-center text-sm text-muted-foreground animate-pulse">
              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <span>Solar Agent is analyzing queries, executing tools, and verifying facts...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 border-t bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Ask about rooftop solar sizing, TSSPDCL net-metering, subsidies, or savings..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !inputMessage.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <span>Send</span>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
