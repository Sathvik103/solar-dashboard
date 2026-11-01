import Link from 'next/link'
import { getCurrentUser } from '@/lib/dal/users'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/Logo'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="SolarIntel home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Create account</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-1 px-4 py-6 text-[12px] text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>SolarIntel, rooftop solar for Telangana homes.</span>
          <span>Tariffs: TGSPDCL FY 2025-26 schedule. Weather: Open-Meteo. Subsidy: MNRE PM Surya Ghar.</span>
        </div>
      </footer>
    </div>
  )
}
