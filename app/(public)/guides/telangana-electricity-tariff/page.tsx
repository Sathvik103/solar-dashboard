import GuideShell, { StaticBars, type Faq } from '@/components/guides/GuideShell'
import { calculateTelanganaTariff, LT1_FIXED_CHARGE_PER_KW_INR, TARIFF_SOURCE } from '@/lib/calculations/tariffs'

export const metadata = {
  title: 'Telangana electricity tariff 2026: LT-I domestic slabs explained',
  description:
    'TGSPDCL and TGNPDCL domestic (LT-I) slab rates for FY 2026-27, worked examples from 100 to 900 units, and why the top slab decides your solar savings.',
  alternates: { canonical: '/guides/telangana-electricity-tariff' },
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const EXAMPLES = [80, 150, 200, 201, 300, 450, 900]

const FAQS: Faq[] = [
  {
    q: 'Why does using 201 units cost so much more than 200?',
    a: 'Above 200 units a month the whole bill moves to the LT-I(C) ladder, where the first 200 units are charged at ₹5.10 instead of ₹3.40 and ₹4.80. One extra unit re-prices every unit before it.',
  },
  {
    q: 'What does each unit of solar save?',
    a: 'Solar reduces the units you buy from the top of your ladder first, so each solar unit saves your top slab rate, not the average rate on the bill.',
  },
  {
    q: 'Are electricity duty and fuel surcharge included here?',
    a: 'No. The DISCOM adds electricity duty under the Telangana Electricity Duty Act and the fuel surcharge adjustment on top of the energy and fixed charges shown here.',
  },
]

export default function TariffGuide() {
  const rows = EXAMPLES.map((u) => ({ units: u, bill: calculateTelanganaTariff(u) }))
  return (
    <GuideShell
      slug="telangana-electricity-tariff"
      title="Telangana electricity tariff, explained"
      lede="Domestic (LT-I) consumers in Telangana are billed on one of three slab ladders, chosen by total monthly consumption. Here is how it works, with every example computed by the same code SolarIntel uses."
      updated="2026-11-01"
      faqs={FAQS}
      sources={[{ label: TARIFF_SOURCE.schedule, href: TARIFF_SOURCE.url }]}
    >
      <section>
        <h2>The three ladders</h2>
        <p>
          The category depends on the whole month&apos;s units, and each category has its own telescopic slabs. The fixed charge
          is ₹{LT1_FIXED_CHARGE_PER_KW_INR} per kW of sanctioned load per month.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b text-left">
                <th className="eyebrow px-5 py-2.5 font-medium">Monthly use</th>
                <th className="eyebrow px-3 py-2.5 font-medium">Category</th>
                <th className="eyebrow px-5 py-2.5 text-right font-medium">Slab rates per unit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="px-5 py-3">Up to 100</td><td className="num px-3">LT-I(A)</td><td className="num px-5 text-right">0-50 ₹1.95 · 51-100 ₹3.10</td></tr>
              <tr><td className="px-5 py-3">101 to 200</td><td className="num px-3">LT-I(B)</td><td className="num px-5 text-right">0-100 ₹3.40 · 101-200 ₹4.80</td></tr>
              <tr><td className="px-5 py-3">Above 200</td><td className="num px-3">LT-I(C)</td><td className="num px-5 text-right">0-200 ₹5.10 · to 300 ₹7.70 · to 400 ₹9.00 · to 800 ₹9.50 · above ₹10.00</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Worked examples</h2>
        <p>Energy plus fixed charge for a 1 kW sanctioned load, before electricity duty and fuel surcharge.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b text-left">
                <th className="eyebrow px-5 py-2.5 font-medium">Units</th>
                <th className="eyebrow px-3 py-2.5 font-medium">Category</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Bill</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Average</th>
                <th className="eyebrow px-5 py-2.5 text-right font-medium">Top slab</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(({ units, bill }) => (
                <tr key={units}>
                  <td className="num px-5 py-3">{units}</td>
                  <td className="num px-3">{bill.subcategory}</td>
                  <td className="num px-3 text-right">{inr(bill.estimatedTotalBillInr)}</td>
                  <td className="num px-3 text-right">₹{bill.effectiveRatePerUnit?.toFixed(2)}</td>
                  <td className="num px-5 text-right">₹{bill.marginalRatePerUnit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <StaticBars data={rows.map((r) => ({ label: String(r.units), value: r.bill.estimatedTotalBillInr }))} unit="₹ per month" />
        </div>
      </section>

      <section>
        <h2>What this means for solar</h2>
        <p>
          A household using 450 units pays ₹9.50 for every unit above 400. A rooftop system that generates 375 units removes
          the most expensive units first, so the first solar units are worth ₹9.50 each, then ₹9.00, then ₹7.70. Sizing to
          drop below 200 units a month moves the whole bill back to the cheaper LT-I(B) ladder.
        </p>
      </section>
    </GuideShell>
  )
}
