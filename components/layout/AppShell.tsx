'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookText, Gauge, LineChart, LogOut, Menu, MessageSquareText, Ruler, Settings, X } from 'lucide-react'
import { logOutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import AssistantProvider, { useAssistant } from '@/components/assistant/AssistantProvider'
import AssistantDrawer from '@/components/assistant/AssistantDrawer'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/history', label: 'Energy log', icon: LineChart },
  { href: '/analysis', label: 'Planner', icon: Ruler },
  { href: '/knowledge', label: 'Regulations', icon: BookText },
  { href: '/profile', label: 'Settings', icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
              active
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
            )}
          >
            <Icon className={cn('size-4', active && 'text-primary')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function AssistantToggle({ compact = false }: { compact?: boolean }) {
  const { toggle, open } = useAssistant()
  return (
    <Button
      variant={open ? 'secondary' : 'outline'}
      size={compact ? 'icon-sm' : 'sm'}
      onClick={toggle}
      aria-label="Assistant"
      aria-expanded={open}
    >
      <MessageSquareText />
      {!compact && (
        <>
          Assistant
          <kbd className="num ml-1 hidden rounded-sm border px-1 text-[10px] text-muted-foreground xl:inline">Ctrl J</kbd>
        </>
      )}
    </Button>
  )
}

function SidebarFooter({ email }: { email: string }) {
  return (
    <div className="border-t pt-3">
      <p className="truncate px-2.5 text-[12px] text-muted-foreground" title={email}>
        {email}
      </p>
      <form action={logOutAction}>
        <button
          type="submit"
          className="mt-1 flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </div>
  )
}

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu after navigation
    setMobileNav(false)
  }, [pathname])

  return (
    <AssistantProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r bg-sidebar px-3 py-4 lg:flex">
          <div className="space-y-6">
            <Link href="/dashboard" className="block px-2.5">
              <Logo />
            </Link>
            <NavLinks />
          </div>
          <div className="space-y-3">
            <div className="px-0.5">
              <AssistantToggle />
            </div>
            <SidebarFooter email={email} />
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon-sm" aria-label="Open menu" onClick={() => setMobileNav(true)}>
            <Menu />
          </Button>
          <Link href="/dashboard">
            <Logo />
          </Link>
          <AssistantToggle compact />
        </header>

        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-foreground/20" onClick={() => setMobileNav(false)} aria-hidden />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col justify-between bg-sidebar px-3 py-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2.5">
                  <Logo />
                  <Button variant="ghost" size="icon-xs" aria-label="Close menu" onClick={() => setMobileNav(false)}>
                    <X />
                  </Button>
                </div>
                <NavLinks onNavigate={() => setMobileNav(false)} />
              </div>
              <SidebarFooter email={email} />
            </div>
          </div>
        )}

        <main className="min-w-0">{children}</main>
      </div>
      <AssistantDrawer />
    </AssistantProvider>
  )
}
