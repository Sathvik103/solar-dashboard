import Link from 'next/link'
import {
  LayoutDashboard,
  Calculator,
  History,
  User,
  BookOpen,
  LogOut,
  Sun,
  Sparkles,
  Sliders,
} from 'lucide-react'
import { logOutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'

export default function AppSidebar() {
  return (
    <aside className="w-64 border-r bg-card min-h-screen flex flex-col justify-between p-4 shrink-0">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 px-2 pt-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-foreground block leading-tight">
              SolarIntel
            </span>
            <span className="text-[10px] text-emerald-600 font-medium tracking-wider uppercase block">
              Telangana Platform
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 text-emerald-600" />
            Dashboard
          </Link>

          <Link
            href="/chat"
            className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>AI Advisor</span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono">
              Agent
            </span>
          </Link>

          <Link
            href="/analysis"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Sliders className="h-4 w-4 text-emerald-600" />
            Solar Studio
          </Link>

          <Link
            href="/calculator"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Calculator
          </Link>

          <Link
            href="/knowledge"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Knowledge Base
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <History className="h-4 w-4 text-muted-foreground" />
            History
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
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
