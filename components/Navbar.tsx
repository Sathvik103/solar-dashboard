'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'

export default function Navbar() {
    const pathname = usePathname() // tells you the current route
  return (
    <nav className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900">
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