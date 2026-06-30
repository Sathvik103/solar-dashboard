import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import HomeContent from '@/components/HomeComponents'

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-8 py-12 flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit">Hyderabad · 4kW System · 10 Panels</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Solar Panel Dashboard</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          A monitoring and ROI analysis tool built around a simulated 10-panel
          Monocrystalline PERC system in Hyderabad. All values use real TSSPDCL
          tariffs, actual Hyderabad irradiance data, and current Indian market panel prices.
        </p>
        <div className="flex gap-3 mt-2">
          <Button asChild>
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/calculator">ROI Calculator</Link>
          </Button>
        </div>
      </section>

      <HomeContent />
    </main>
  )
}