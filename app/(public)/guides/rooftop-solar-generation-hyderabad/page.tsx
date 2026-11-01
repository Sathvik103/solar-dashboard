import GuideShell, { StaticBars, type Faq } from '@/components/guides/GuideShell'
import { geocode, getMonthlyClimatology } from '@/lib/data/weather'
import { runSolarMLInference } from '@/lib/ml/inference'

// Recomputed at most once a day from ten years of measured data.
export const revalidate = 86400

export const metadata = {
  title: 'Rooftop solar generation in Hyderabad, month by month',
  description:
    'How many units a 1 kW rooftop solar system generates in Hyderabad each month, from ten years of measured irradiance and temperature (ERA5).',
  alternates: { canonical: '/guides/rooftop-solar-generation-hyderabad' },
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

async function loadClimate() {
  try {
    const coords = await geocode('Hyderabad', 'Telangana')
    const monthly = await getMonthlyClimatology(coords)
    if (monthly.some((m) => m.ghiKwhM2Day <= 0)) return null
    return monthly.map((m) => ({ month: MONTHS[m.month], ghi: m.ghiKwhM2Day, avgTempC: m.tempC }))
  } catch {
    return null
  }
}

export default async function GenerationGuide() {
  const climate = await loadClimate()
  const curve = runSolarMLInference({ capacityKw: 1, roofAreaSqft: 100, climate: climate ?? undefined })
  const annual = curve.predictedAnnualKwh

  const faqs: Faq[] = [
    {
      q: 'How many units does a 1 kW system generate in a year in Hyderabad?',
      a: `About ${annual.toLocaleString('en-IN')} kWh for a south-facing, unshaded system, or roughly ${Math.round(annual / 12)} kWh a month on average.`,
    },
    {
      q: 'Which months generate the least?',
      a: `${curve.lowestProductionMonth} is the lowest month because of monsoon cloud. ${curve.peakProductionMonth} is the highest.`,
    },
    {
      q: 'How do I size a system from this?',
      a: 'Divide your average monthly units by the average monthly output per kW. A home using 350 units a month needs roughly that many kW, limited by roof area and sanctioned load.',
    },
  ]

  return (
    <GuideShell
      slug="rooftop-solar-generation-hyderabad"
      title="How much does a rooftop system generate in Hyderabad?"
      lede={`A 1 kW south-facing system in Hyderabad produces about ${annual.toLocaleString('en-IN')} kWh a year. Output peaks in ${curve.peakProductionMonth} and dips in the monsoon.`}
      updated="2026-11-01"
      faqs={faqs}
      sources={[
        { label: 'ERA5 reanalysis via Open-Meteo historical weather API', href: 'https://open-meteo.com/en/docs/historical-weather-api' },
      ]}
    >
      <section>
        <h2>Output per kW, by month</h2>
        <p>
          {climate
            ? 'Computed from the ten-year mean of daily irradiance and temperature for Hyderabad, with temperature, shading and system losses applied.'
            : 'Live climate data was unavailable, so this uses the built-in reference climatology for Hyderabad.'}
        </p>
        <div className="mt-4">
          <StaticBars data={curve.monthlyCurve.map((m) => ({ label: m.month, value: m.monthlyKwh }))} unit="kWh per kW" />
        </div>
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b text-left">
                <th className="eyebrow px-5 py-2.5 font-medium">Month</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Irradiance</th>
                <th className="eyebrow px-3 py-2.5 text-right font-medium">Mean temp</th>
                <th className="eyebrow px-5 py-2.5 text-right font-medium">Output per kW</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {curve.monthlyCurve.map((m) => (
                <tr key={m.month}>
                  <td className="px-5 py-2.5">{m.month}</td>
                  <td className="num px-3 text-right">{m.averageGhi.toFixed(2)} kWh/m²/day</td>
                  <td className="num px-3 text-right">{m.avgTempCelsius.toFixed(1)} °C</td>
                  <td className="num px-5 text-right">{m.monthlyKwh} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>What changes the numbers</h2>
        <ul>
          <li>East or west-facing roofs produce about 12% less than south-facing.</li>
          <li>Partial shading costs around 15%, heavy shading around 30%.</li>
          <li>Heat lowers panel efficiency, which is why May produces less than its sunshine suggests.</li>
          <li>Once you have a system, SolarIntel calibrates this model to your own meter readings.</li>
        </ul>
      </section>
    </GuideShell>
  )
}
