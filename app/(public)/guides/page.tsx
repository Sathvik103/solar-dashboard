import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SITE } from '@/lib/site'

export const metadata = {
  title: 'Rooftop solar guides for Telangana',
  description:
    'Plain-language guides to Telangana electricity tariffs, the PM Surya Ghar subsidy, and how much a rooftop system generates in Hyderabad, with the numbers worked out.',
  alternates: { canonical: '/guides' },
}

const GUIDES = [
  {
    href: '/guides/telangana-electricity-tariff',
    title: 'Telangana electricity tariff, explained',
    body: 'How the LT-I domestic slabs work, why 201 units costs far more than 200, and what each solar unit actually saves.',
  },
  {
    href: '/guides/pm-surya-ghar-subsidy',
    title: 'PM Surya Ghar subsidy by system size',
    body: 'The exact subsidy for 1 to 10 kW, how fractional sizes are pro-rated, and the net cost after subsidy.',
  },
  {
    href: '/guides/rooftop-solar-generation-hyderabad',
    title: 'How much does a rooftop system generate in Hyderabad?',
    body: 'Month-by-month output per kW from ten years of measured irradiance and temperature.',
  },
]

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-14 sm:px-6 lg:py-20">
      <p className="eyebrow">Guides</p>
      <h1 className="mt-3 max-w-2xl text-[36px] leading-[1.15] font-semibold tracking-tight">
        Rooftop solar in Telangana, with the numbers worked out
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
        Every figure on these pages is computed by the same code {SITE.name} uses for its calculators, from the current
        tariff order, the MNRE subsidy rules and measured weather data.
      </p>
      <div className="stagger mt-10 grid gap-4 md:grid-cols-3">
        {GUIDES.map((g) => (
          <Link key={g.href} href={g.href} className="group lift flex flex-col justify-between gap-6 rounded-lg border bg-card p-6">
            <div>
              <h2 className="text-[16px] font-semibold">{g.title}</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{g.body}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[13px] text-primary">
              Read <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
