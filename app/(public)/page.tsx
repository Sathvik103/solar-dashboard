import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SunArc from '@/components/marketing/SunArc'
import PipelineDiagram from '@/components/devices/PipelineDiagram'
import { NET_METERING_SETTLEMENT_INR_PER_KWH, TARIFF_SOURCE } from '@/lib/calculations/tariffs'
import { PM_SURYA_GHAR } from '@/lib/calculations/financial'
import { SITE, jsonLd } from '@/lib/site'

export const metadata = {
  title: { absolute: `${SITE.name} · ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: '/' },
}

const STEPS = [
  {
    title: 'Plan',
    body: 'Enter one bill and your roof. Generation is modelled from ten years of measured weather for your city; savings follow the real slab ladder month by month.',
  },
  {
    title: 'Connect',
    body: 'Register your inverter or meter. A small agent reads it over Modbus, or your MQTT broker forwards readings, every few minutes.',
  },
  {
    title: 'Track',
    body: 'Readings roll up into daily energy, the model calibrates itself to your roof, and the dashboard shows what you saved against what the weather allowed.',
  },
]

const FACTS = [
  { k: 'Subsidy cap', v: `₹${PM_SURYA_GHAR.capInr.toLocaleString('en-IN')}`, n: 'PM Surya Ghar, reached at 3 kW' },
  { k: 'Top slab', v: '₹10.00', n: 'per unit above 800 units' },
  { k: 'Year-end export', v: `₹${NET_METERING_SETTLEMENT_INR_PER_KWH.toFixed(2)}`, n: 'per unused surplus kWh' },
  { k: 'Climate record', v: '10 yrs', n: 'of measured irradiance' },
]

const FAQS = [
  {
    q: 'Do I need hardware to use SolarIntel?',
    a: 'No. Planning works from one electricity bill. Connecting an inverter or meter adds live monitoring and lets the model calibrate to your roof.',
  },
  {
    q: 'Which inverters work?',
    a: 'Any inverter that exposes SunSpec registers over Modbus TCP, anything already publishing to MQTT, or any device that can make an HTTPS request.',
  },
  {
    q: 'Does the assistant make things up?',
    a: 'It only answers about rooftop solar, tariffs, subsidies and your own data, uses the calculators for every number, cites the documents it relies on, and flags any amount it cannot trace.',
  },
]

export default function HomePage() {
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: SITE.name,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        description: SITE.description,
        url: SITE.url,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        areaServed: { '@type': 'State', name: 'Telangana' },
      },
      { '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg` },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />

      <section className="mx-auto grid w-full max-w-[1120px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
        <div className="animate-in-up">
          <p className="eyebrow">Hyderabad and Telangana</p>
          <h1 className="mt-3 text-[40px] leading-[1.08] font-semibold tracking-tight sm:text-[54px]">
            Know what your roof will earn before you install.
          </h1>
          <p className="mt-5 max-w-xl text-[15.5px] leading-7 text-muted-foreground">
            Size a system from your bill and roof, price it with the subsidy, then connect your inverter and see what it
            actually produces against what the weather allowed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create a free account <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/guides">Read the guides</Link>
            </Button>
          </div>
          <p className="mt-6 text-[12px] text-muted-foreground">{TARIFF_SOURCE.schedule}.</p>
        </div>
        <div className="animate-in-up [animation-delay:120ms]">
          <SunArc />
        </div>
      </section>

      <section className="border-y bg-surface">
        <div className="stagger mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.k} className="px-2 py-8 lg:px-6">
              <p className="eyebrow">{f.k}</p>
              <p className="num mt-1 text-[30px] leading-9">{f.v}</p>
              <p className="text-[12.5px] text-muted-foreground">{f.n}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-[1120px] scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl text-[30px] leading-tight font-semibold tracking-tight">
          From one bill to a calibrated, monitored system.
        </h2>
        <div className="stagger mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="border-t pt-5">
              <p className="num text-[12px] text-primary">0{i + 1}</p>
              <h3 className="mt-2 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <PipelineDiagram />
        </div>
      </section>

      <section className="border-t bg-surface">
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-[26px] leading-tight font-semibold tracking-tight">Before you sign up</h2>
          </div>
          <div className="divide-y rounded-lg border bg-card">
            {FAQS.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-[14.5px] font-medium">
                  <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-45">+</span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-5 text-[14px] leading-6 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg bg-foreground p-8 text-background md:flex-row md:items-center">
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight">Start with one electricity bill.</h2>
            <p className="mt-1 text-[14px] opacity-75">Units, bill amount and roof area are enough for a first proposal.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
