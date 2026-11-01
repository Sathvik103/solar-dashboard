'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronDown, ExternalLink, History, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Markdown from './Markdown'
import ArtifactView from './ArtifactView'
import { useAssistant, type AssistantMessage } from './AssistantProvider'

const STARTERS = [
  'Which system size suits my consumption?',
  'How much PM Surya Ghar subsidy would I get for 3 kW?',
  'What documents does TSSPDCL need for net metering?',
  'How is surplus export settled at year end?',
]

function Sources({ message }: { message: AssistantMessage }) {
  if (!message.citations?.length) return null
  return (
    <div className="mt-3 border-t pt-2.5">
      <p className="eyebrow mb-1.5">Sources</p>
      <ol className="space-y-1">
        {message.citations.map((c, i) => (
          <li key={c.id || i} className="flex gap-2 text-[12px] leading-5">
            <span className="num text-muted-foreground">{i + 1}.</span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground">{c.title}</span>
              {c.sectionTitle && <span className="text-muted-foreground"> · {c.sectionTitle}</span>}
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  open <ExternalLink className="size-3" />
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Working({ message }: { message: AssistantMessage }) {
  const [open, setOpen] = useState(false)
  const tools = message.toolsUsed ?? []
  const steps = message.traceEvents ?? []
  if (tools.length === 0 && steps.length === 0) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        How this was worked out
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 border-l pl-3 text-[12px] leading-5 text-muted-foreground">
          {tools.map((t, i) => (
            <li key={`t-${i}`}>
              <span className="text-foreground">{t.tool}</span>
              {t.success ? '' : ' (failed)'}
              <span className="num"> · {t.durationMs} ms</span>
            </li>
          ))}
          {steps
            .filter((s) => s.status !== 'started')
            .map((s, i) => (
              <li key={s.id || `s-${i}`} className={s.status === 'failed' ? 'text-destructive' : undefined}>
                {s.message}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

const SOURCE_NOTE: Record<string, string> = {
  deterministic: 'Calculated directly',
  cache: 'Same as a recent answer',
  budget: 'Daily limit reached',
  fallback: 'Figures only',
}

/** Rotating status while the assistant works, so a 2-5 s wait does not feel frozen. */
function Thinking() {
  const steps = ['Reading your profile and readings', 'Running the calculators', 'Checking the regulations', 'Writing the answer']
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 1100)
    return () => clearInterval(id)
  }, [steps.length])
  return (
    <li className="flex items-center gap-2.5 text-[13px] text-muted-foreground" aria-live="polite">
      <span className="flex gap-1">
        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
        <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
      </span>
      <span key={i} className="animate-in-up">
        {steps[i]}
      </span>
    </li>
  )
}

export default function AssistantDrawer() {
  const {
    open,
    setOpen,
    send,
    messages,
    pending,
    conversations,
    conversationId,
    selectConversation,
    deleteConversation,
  } = useAssistant()
  const [draft, setDraft] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Auto-grow the composer up to ~6 lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }, [draft])

  const submit = () => {
    if (!draft.trim() || pending) return
    void send(draft)
    setDraft('')
  }

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        role="dialog"
        aria-label="Assistant"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l bg-card shadow-[0_0_0_1px_var(--border),-16px_0_40px_-24px_rgb(0_0_0/0.25)] transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Assistant</p>
            <p className="truncate text-[12px] text-muted-foreground">
              {conversationId
                ? conversations.find((c) => c.id === conversationId)?.title ?? 'Conversation'
                : 'Answers cite their sources'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Past conversations"
              aria-pressed={showHistory}
              onClick={() => setShowHistory((s) => !s)}
            >
              <History />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="New conversation"
              onClick={() => {
                void selectConversation(undefined)
                setShowHistory(false)
              }}
            >
              <Plus />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </div>
        </header>

        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="p-4 text-[13px] text-muted-foreground">No past conversations.</p>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        void selectConversation(c.id)
                        setShowHistory(false)
                      }}
                      className={cn(
                        'min-w-0 flex-1 rounded-md px-3 py-2 text-left hover:bg-muted',
                        c.id === conversationId && 'bg-muted'
                      )}
                    >
                      <span className="block truncate text-[13px]">{c.title}</span>
                      <span className="num block text-[11px] text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${c.title}`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void deleteConversation(c.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4 pt-6">
                <div>
                  <p className="text-[15px] font-semibold">Ask about your rooftop solar</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Answers use your profile and readings, Telangana tariff and subsidy rules, and cite the documents
                    they rely on.
                  </p>
                </div>
                <div className="divide-y rounded-md border">
                  {STARTERS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-muted"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="space-y-5">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <li key={m.id} className="animate-in-up flex justify-end">
                      <div className="max-w-[85%] rounded-md bg-secondary px-3 py-2 text-[13.5px] leading-6 whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </li>
                  ) : (
                    <li key={m.id} className={cn('animate-in-up', m.failed && 'text-destructive')}>
                      {m.failed ? <p className="text-[13px]">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                      {!!m.artifacts?.length && (
                        <div className="mt-3 space-y-3">
                          {m.artifacts.map((a) => (
                            <ArtifactView key={a.id} artifact={a} />
                          ))}
                        </div>
                      )}
                      <Sources message={m} />
                      <div className="flex items-center justify-between gap-2">
                        <Working message={m} />
                        {m.source && SOURCE_NOTE[m.source] && (
                          <span className="mt-2 text-[11px] text-muted-foreground">{SOURCE_NOTE[m.source]}</span>
                        )}
                      </div>
                      {m === messages.at(-1) && !pending && !!m.suggestions?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {m.suggestions.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => void send(q)}
                              className="rounded-md border bg-background px-2.5 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                )}
                {pending && <Thinking />}
              </ol>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="shrink-0 border-t p-3"
        >
          <div className="flex items-end gap-2 rounded-md border border-input bg-background px-3 py-2 focus-within:border-ring">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask a question"
              aria-label="Message"
              className="max-h-36 min-h-6 flex-1 resize-none bg-transparent text-[13.5px] leading-6 outline-none placeholder:text-muted-foreground/80"
            />
            <Button type="submit" size="icon-xs" disabled={pending || !draft.trim()} aria-label="Send">
              <ArrowUp />
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Enter to send, Shift+Enter for a new line. Ctrl+J opens or closes this panel.
          </p>
        </form>
      </aside>
    </>
  )
}
