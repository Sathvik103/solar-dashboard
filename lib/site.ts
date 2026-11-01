/** Canonical site settings used by metadata, sitemap, robots and structured data. */
export const SITE = {
  name: 'SolarIntel',
  url: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  tagline: 'Rooftop solar planning and monitoring for Telangana homes',
  description:
    'Size, price and track a rooftop solar system in Telangana: current TGSPDCL tariff slabs, PM Surya Ghar subsidy, weather-modelled generation and live inverter data.',
  locale: 'en_IN',
} as const

export const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/guides', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/guides/telangana-electricity-tariff', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/guides/pm-surya-ghar-subsidy', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/guides/rooftop-solar-generation-hyderabad', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/signup', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/login', changeFrequency: 'yearly', priority: 0.3 },
] as const

/** JSON-LD helper: renders a script tag server-side. Content is static data we control. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify(data).replace(/</g, '\\u003c') }
}
