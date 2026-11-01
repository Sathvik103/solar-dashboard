import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/Logo'

/**
 * Static marketing layout: no session lookup here, so the landing page and guides can be prerendered
 * and cached. Signed-in visitors to /login or /signup are redirected to the dashboard by those pages.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="SolarIntel home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 text-[13px] sm:flex" aria-label="Site">
              <Link href="/guides" className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground">
                Guides
              </Link>
              <Link href="/#how-it-works" className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground">
                How it works
              </Link>
            </nav>
          </div>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-10 text-[12.5px] text-muted-foreground sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-medium text-foreground">SolarIntel</p>
            <p className="mt-1">Rooftop solar planning and monitoring for Telangana homes.</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Guides</p>
            <Link href="/guides/telangana-electricity-tariff" className="block hover:text-foreground">Telangana tariff</Link>
            <Link href="/guides/pm-surya-ghar-subsidy" className="block hover:text-foreground">PM Surya Ghar subsidy</Link>
            <Link href="/guides/rooftop-solar-generation-hyderabad" className="block hover:text-foreground">Generation in Hyderabad</Link>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Data</p>
            <p>Tariffs: TGSPDCL FY 2025-26 schedule, retained FY 2026-27.</p>
            <p>Weather: Open-Meteo. Subsidy: MNRE PM Surya Ghar.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
