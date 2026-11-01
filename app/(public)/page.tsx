import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NET_METERING_SETTLEMENT_INR_PER_KWH, TARIFF_SOURCE } from '@/lib/calculations/tariffs'
import { PM_SURYA_GHAR } from '@/lib/calculations/financial'

export const metadata = {
  title: { absolute: 'SolarIntel · Rooftop solar for Telangana homes' },
  description:
    'Size, price and track a rooftop solar system with weather-modelled output, your own meter readings, and the current Telangana tariff and subsidy rules.',
}

const LADDER = [
  { band: 'Up to 100 units', cat: 'LT-I(A)', rates: '₹1.95, ₹3.10' },
  { band: '101 to 200 units', cat: 'LT-I(B)', rates: '₹3.40, ₹4.80' },
  { band: 'Above 200 units', cat: 'LT-I(C)', rates: '₹5.10 rising to ₹10.00' },
]

const PILLARS = [
  {
    title: 'Modelled from real weather',
    body: 'Hourly irradiance and temperature for your city drive a physics model of your panels. Once you log a week of readings it calibrates itself to your roof.',
  },
  {
    title: 'Measured by you',
    body: 'Enter daily totals, import a CSV, or let an inverter or data logger push readings. Savings use your own bills, not an average.',
  },
  {
    title: 'Rules with sources',
    body: 'Tariff slabs, the PM Surya Ghar subsidy and the year-end export rate come from the current orders, and the assistant cites the document behind each answer.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-[1120px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow">Hyderabad and Telangana</p>
          <h1 className="mt-3 text-[40px] leading-[1.1] font-semibold tracking-tight sm:text-[52px]">
            Know what your roof will earn before you install.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
            SolarIntel sizes a rooftop system from your consumption and roof, prices it with the subsidy, and tracks
            what it actually produces against what the weather says it should.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create a free account <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <p className="text-[13px] font-medium">How a saving is worked out</p>
            <p className="text-[12px] text-muted-foreground">{TARIFF_SOURCE.schedule}</p>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b text-left">
                <th className="eyebrow px-5 py-2 font-medium">Monthly use</th>
                <th className="eyebrow px-3 py-2 font-medium">Category</th>
                <th className="eyebrow px-5 py-2 text-right font-medium">Per unit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {LADDER.map((r) => (
                <tr key={r.cat}>
                  <td className="px-5 py-2.5">{r.band}</td>
                  <td className="num px-3 py-2.5 text-muted-foreground">{r.cat}</td>
                  <td className="num px-5 py-2.5 text-right">{r.rates}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="grid grid-cols-2 gap-px border-t bg-border">
            <div className="bg-card px-5 py-3">
              <dt className="eyebrow">Subsidy</dt>
              <dd className="num mt-0.5 text-[15px]">up to ₹{PM_SURYA_GHAR.capInr.toLocaleString('en-IN')}</dd>
            </div>
            <div className="bg-card px-5 py-3">
              <dt className="eyebrow">Year-end export</dt>
              <dd className="num mt-0.5 text-[15px]">₹{NET_METERING_SETTLEMENT_INR_PER_KWH.toFixed(2)}/kWh</dd>
            </div>
          </dl>
          <p className="border-t px-5 py-3 text-[12px] leading-5 text-muted-foreground">
            Solar removes your most expensive units first, so each kWh saves the rate of your top slab, not the
            average.
          </p>
        </div>
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto grid w-full max-w-[1120px] gap-px px-4 py-14 sm:px-6 md:grid-cols-3 md:gap-10">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="py-4 md:py-0">
              <p className="num text-[12px] text-primary">0{i + 1}</p>
              <h2 className="mt-2 text-[15px] font-semibold">{p.title}</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border bg-card p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight">Start with one electricity bill.</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              Units, bill amount and roof area are enough for a first proposal. Everything else can come later.
            </p>
          </div>
          <Button asChild size="lg" variant="dark">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
