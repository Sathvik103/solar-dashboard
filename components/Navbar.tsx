'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'

export default function Navbar() {
    const pathname = usePathname() // tells you the current route
  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b bg-card">
      <Link href="/" className="text-xl font-bold">
        Solar Dashboard
      </Link>
      <div className="flex space-x-4">
        <Button variant={pathname === '/dashboard' ? 'default' : 'ghost'} asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant={pathname === '/calculator' ? 'default' : 'ghost'} asChild>
          <Link href="/calculator">Calculator</Link>
        </Button>
        <Button variant={pathname === '/history' ? 'default' : 'ghost'} asChild>
          <Link href="/history">History</Link>
        </Button>
      </div>
    </nav>
  )
}