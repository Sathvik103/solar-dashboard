'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, Menu, MessageSquareText, Search, Settings, X } from 'lucide-react'
import { logOutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import AssistantProvider, { useAssistant } from '@/components/assistant/AssistantProvider'
import AssistantDrawer from '@/components/assistant/AssistantDrawer'
import CommandPalette from './CommandPalette'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/devices', label: 'Devices' },
  { href: '/history', label: 'Energy log' },
  { href: '/analysis', label: 'Planner' },
  { href: '/knowledge', label: 'Regulations' },
]

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

/** Horizontal tabs with a sliding underline that follows the active page. */
function TopNav() {
  const pathname = usePathname()
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const active = NAV.find((n) => isActive(pathname, n.href))
    const el = active ? refs.current[active.href] : null
    setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null)
  }, [pathname])

  return (
    <nav className="relative hidden h-full items-stretch md:flex" aria-label="Main">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          ref={(el) => {
            refs.current[n.href] = el
          }}
          aria-current={isActive(pathname, n.href) ? 'page' : undefined}
          className={cn(
            'flex items-center px-3 text-[13px] transition-colors',
            isActive(pathname, n.href) ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {n.label}
        </Link>
      ))}
      {bar && (
        <span
          aria-hidden
          className="absolute bottom-0 h-[2px] bg-primary transition-[left,width] duration-300 ease-out"
          style={{ left: bar.left + 10, width: bar.width - 20 }}
        />
      )}
    </nav>
  )
}

function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 items-center gap-1.5 rounded-md px-1.5 hover:bg-muted"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background uppercase">
          {email.slice(0, 1)}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div role="menu" className="animate-in-up absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <p className="truncate border-b px-3 py-2.5 text-[12px] text-muted-foreground">{email}</p>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-muted">
            <Settings className="size-4 text-muted-foreground" /> Settings
          </Link>
          <form action={logOutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-muted">
              <LogOut className="size-4 text-muted-foreground" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function HeaderActions({ onSearch }: { onSearch: () => void }) {
  const { toggle, open } = useAssistant()
  return (
    <>
      <button
        type="button"
        onClick={onSearch}
        className="hidden h-8 w-56 items-center gap-2 rounded-md border bg-card px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:border-primary/40 lg:flex"
      >
        <Search className="size-3.5" />
        Search or ask
        <kbd className="num ml-auto rounded-sm border px-1 text-[10px]">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Search" onClick={onSearch}>
        <Search />
      </Button>
      <Button variant={open ? 'secondary' : 'outline'} size="sm" onClick={toggle} aria-expanded={open}>
        <MessageSquareText />
        <span className="hidden sm:inline">Assistant</span>
      </Button>
    </>
  )
}

function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileNav, setMobileNav] = useState(false)
  const [palette, setPalette] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu after navigation
    setMobileNav(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md transition-shadow',
          scrolled && 'shadow-[0_6px_20px_-16px_rgb(0_0_0/0.45)]'
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-10">
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu" onClick={() => setMobileNav(true)}>
            <Menu />
          </Button>
          <Link href="/dashboard" aria-label="SolarIntel overview" className="mr-2 shrink-0">
            <Logo />
          </Link>
          <TopNav />
          <div className="ml-auto flex items-center gap-2">
            <HeaderActions onSearch={() => setPalette(true)} />
            <AccountMenu email={email} />
          </div>
        </div>
      </header>

      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/25" onClick={() => setMobileNav(false)} aria-hidden />
          <div className="animate-in-up absolute inset-x-3 top-3 rounded-lg border bg-popover p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between px-1">
              <Logo />
              <Button variant="ghost" size="icon-xs" aria-label="Close menu" onClick={() => setMobileNav(false)}>
                <X />
              </Button>
            </div>
            <nav className="flex flex-col" aria-label="Main">
              {[...NAV, { href: '/profile', label: 'Settings' }].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'rounded-md px-3 py-2.5 text-[14px]',
                    isActive(pathname, n.href) ? 'bg-muted font-medium' : 'text-muted-foreground'
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="min-w-0">{children}</main>
      {palette && <CommandPalette open onOpenChange={setPalette} />}
      <AssistantDrawer />
    </div>
  )
}

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <AssistantProvider>
      <Shell email={email}>{children}</Shell>
    </AssistantProvider>
  )
}
