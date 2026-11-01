import GuideShell, { StaticBars, type Faq } from '@/components/guides/GuideShell'
import { calculatePMSuryaGharSubsidy, PM_SURYA_GHAR } from '@/lib/calculations/financial'
import { SOLAR_COST_PER_KW_INR } from '@/lib/calculations/systemSizing'

export const metadata = {
  title: 'PM Surya Ghar subsidy 2026: amount by system size',
  description:
    'Exact PM Surya Ghar Muft Bijli Yojana subsidy for 1 to 10 kW rooftop systems, how fractional sizes are calculated, and the cost after subsidy.',
  alternates: { canonical: '/guides/pm-surya-ghar-subsidy' },
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const SIZES = [1, 1.5, 2, 2.5, 3, 4, 5, 7, 10]

const FAQS: Faq[] = [
  {
    q: 'Is there extra subsidy above 3 kW?',
    a: `No. The central financial assistance is capped at ${inr(PM_SURYA_GHAR.capInr)}, which is reached at 3 kW. Larger residential systems get the same amount.`,
  },
  {
    q: 'How is a 2.5 kW system calculated?',
    a: `The first 2 kW earn ${inr(PM_SURYA_GHAR.firstTierPerKwInr)} each and the next half kW earns half of ${inr(PM_SURYA_GHAR.secondTierPerKwInr)}, giving ${inr(calculatePMSuryaGharSubsidy(2.5))}.`,
  },
  {
    q: 'When is the subsidy paid?',
    a: 'After the system is installed, inspected and commissioned with net metering, the subsidy is credited to the bank account registered on the national portal.',
  },
]

export default function SubsidyGuide() {
  const rows = SIZES.map((kw) => {
    const subsidy = calculatePMSuryaGharSubsidy(kw)
    const gross = kw * SOLAR_COST_PER_KW_INR
    return { kw, subsidy, gross, net: Math.max(0, gross - subsidy), share: subsidy / gross }
  })

  return (
    <GuideShell
      slug="pm-surya-ghar-subsidy"
      title="PM Surya Ghar subsidy by system size"
      lede={`Residential rooftop systems get ${inr(PM_SURYA_GHAR.firstTierPerKwInr)} per kW for the first 2 kW and ${inr(PM_SURYA_GHAR.secondTierPerKwInr)} for the third kW, capped at ${inr(PM_SURYA_GHAR.capInr)}. Fractional sizes are pro-rated.`}
      updated="2026-11-01"
      faqs={FAQS}
      sources={[
        { label: PM_SURYA_GHAR.source, href: 'https://pmsuryaghar.gov.in' },
        { label: 'MNRE amended guidelines (Powerline, July 2025)', href: 'https://powerline.net.in/2025/07/10/mnre-notifies-amended-guidelines-for-pm-surya-ghar-yojana/' },
      ]}
    >
      <section>
        <h2>Subsidy and cost by size</h2>
        <p>
          Installed cost uses a market estimate of {inr(SOLAR_COST_PER_KW_INR)} per kW for an on-grid system; quotes vary by brand
          and installer.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b text-left">
                <th className="eyebrow px-5 py-2.5 font-medium">Size</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Subsidy</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Installed cost</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">You pay</th>
                <th className="eyebrow px-5 py-2.5 text-right font-medium">Covered</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.kw}>
                  <td className="num px-5 py-3">{r.kw} kW</td>
                  <td className="num px-3 text-right">{inr(r.subsidy)}</td>
                  <td className="num px-3 text-right">{inr(r.gross)}</td>
                  <td className="num px-3 text-right">{inr(r.net)}</td>
                  <td className="num px-5 text-right">{Math.round(r.share * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <StaticBars data={rows.map((r) => ({ label: `${r.kw}`, value: r.subsidy }))} unit="₹ subsidy by kW" />
        </div>
      </section>

      <section>
        <h2>Choosing a size</h2>
        <ul>
          <li>The subsidy covers the largest share of cost on systems up to 2 kW.</li>
          <li>At 3 kW you receive the full cap; above that, every extra kW is paid for in full.</li>
          <li>Size to your consumption and roof first. The Telangana tariff guide shows why dropping below 200 units a month matters.</li>
        </ul>
      </section>
    </GuideShell>
  )
}
