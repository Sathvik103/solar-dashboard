'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logOutAction } from '@/actions/auth'
import type { User } from '@/lib/types/user'

type NavbarProps = {
  user?: User | null
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b bg-card">
      <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
        <span className="text-amber-500">☀️</span> SolarIntel
      </Link>
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/profile">Profile</Link>
            </Button>
            <form action={logOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
