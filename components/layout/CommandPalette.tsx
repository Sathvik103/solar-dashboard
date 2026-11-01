'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CornerDownLeft, MessageSquareText, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssistant } from '@/components/assistant/AssistantProvider'

type Command = { id: string; label: string; hint: string; group: 'Go to' | 'Actions'; run: () => void }

/** Ctrl/Cmd + K: jump to any page, start an action, or send the typed text to the assistant. */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const { ask } = useAssistant()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href)
    return [
      { id: 'overview', label: 'Overview', hint: 'Today, savings, model', group: 'Go to', run: go('/dashboard') },
      { id: 'devices', label: 'Devices', hint: 'Live inverters and meters', group: 'Go to', run: go('/devices') },
      { id: 'log', label: 'Energy log', hint: 'Readings and bills', group: 'Go to', run: go('/history') },
      { id: 'planner', label: 'Planner', hint: 'Size and cost a system', group: 'Go to', run: go('/analysis') },
      { id: 'rules', label: 'Regulations', hint: 'Search the documents', group: 'Go to', run: go('/knowledge') },
      { id: 'settings', label: 'Settings', hint: 'Profile and roof', group: 'Go to', run: go('/profile') },
      { id: 'add-device', label: 'Add a device', hint: 'Register an inverter or meter', group: 'Actions', run: go('/devices') },
      { id: 'add-reading', label: 'Log a reading', hint: 'Daily total or bill', group: 'Actions', run: go('/history') },
      { id: 'guide-tariff', label: 'Telangana tariff guide', hint: 'Public guide', group: 'Actions', run: go('/guides/telangana-electricity-tariff') },
    ]
  }, [router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q))
  }, [commands, query])

  const askItem = query.trim().length > 3
  const total = filtered.length + (askItem ? 1 : 0)

  if (!open) return null

  const runAt = (i: number) => {
    onOpenChange(false)
    if (i < filtered.length) filtered[i].run()
    else ask(query.trim())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="animate-in-up absolute inset-0 bg-foreground/25" onClick={() => onOpenChange(false)} aria-hidden />
      <div className="animate-in-up relative w-full max-w-[560px] overflow-hidden rounded-lg border bg-popover shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)]">
        <div className="flex items-center gap-2.5 border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => (a + 1) % Math.max(1, total))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => (a - 1 + total) % Math.max(1, total))
              } else if (e.key === 'Enter' && total > 0) {
                e.preventDefault()
                runAt(active)
              } else if (e.key === 'Escape') {
                onOpenChange(false)
              }
            }}
            placeholder="Go to a page, or type a question"
            aria-label="Command"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/80"
          />
          <kbd className="num rounded-sm border px-1.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {(['Go to', 'Actions'] as const).map((group) => {
            const items = filtered.filter((c) => c.group === group)
            if (!items.length) return null
            return (
              <li key={group}>
                <p className="eyebrow px-2.5 pt-2 pb-1">{group}</p>
                <ul>
                  {items.map((c) => {
                    const i = filtered.indexOf(c)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === active}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => runAt(i)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px]',
                            i === active ? 'bg-muted' : ''
                          )}
                        >
                          <span>
                            {c.label}
                            <span className="ml-2 text-[12px] text-muted-foreground">{c.hint}</span>
                          </span>
                          {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
          {askItem && (
            <li>
              <p className="eyebrow px-2.5 pt-2 pb-1">Assistant</p>
              <button
                type="button"
                role="option"
                aria-selected={active === filtered.length}
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => runAt(filtered.length)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px]',
                  active === filtered.length ? 'bg-muted' : ''
                )}
              >
                <MessageSquareText className="size-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">Ask: {query.trim()}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </button>
            </li>
          )}
          {total === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">No matches.</li>}
        </ul>
      </div>
    </div>
  )
}
