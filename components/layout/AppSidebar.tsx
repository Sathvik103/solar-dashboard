import Link from 'next/link'
import { LayoutDashboard, Calculator, History, User, BookOpen, LogOut, Sun } from 'lucide-react'
import { logOutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default function AppSidebar() {
  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col justify-between p-4 shrink-0">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 px-2 pt-2">
          <Sun className="h-6 w-6 text-amber-500" />
          <span className="font-bold text-lg tracking-tight">SolarIntel</span>
        </div>

        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            Dashboard
          </Link>

          <Link
            href="/calculator"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Calculator
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <History className="h-4 w-4 text-muted-foreground" />
            History
          </Link>

          <Link
            href="/knowledge"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Knowledge Base
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Solar Profile
          </Link>
        </nav>
      </div>

      <div className="border-t pt-4">
        <form action={logOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3 px-3"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  )
}
