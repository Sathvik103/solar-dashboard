import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE, jsonLd } from '@/lib/site'

export type Faq = { q: string; a: string }

/** Layout, breadcrumbs and Article/FAQ/Breadcrumb structured data shared by every public guide. */
export default function GuideShell({
  slug,
  title,
  lede,
  updated,
  sources,
  faqs = [],
  children,
}: {
  slug: string
  title: string
  lede: string
  updated: string
  sources: { label: string; href: string }[]
  faqs?: Faq[]
  children: React.ReactNode
}) {
  const url = `${SITE.url}/guides/${slug}`
  const graph = [
    {
      '@type': 'Article',
      headline: title,
      description: lede,
      dateModified: updated,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: SITE.name },
      publisher: { '@type': 'Organization', name: SITE.name },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.url}/guides` },
        { '@type': 'ListItem', position: 3, name: title, item: url },
      ],
    },
    ...(faqs.length
      ? [
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ]
      : []),
  ]

  return (
    <article className="mx-auto w-full max-w-[860px] px-4 py-12 sm:px-6 lg:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ '@context': 'https://schema.org', '@graph': graph })} />
      <nav aria-label="Breadcrumb" className="text-[12px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>{' '}
        /{' '}
        <Link href="/guides" className="hover:text-foreground">
          Guides
        </Link>
      </nav>
      <header className="animate-in-up mt-4">
        <h1 className="text-[34px] leading-[1.15] font-semibold tracking-tight sm:text-[40px]">{title}</h1>
        <p className="mt-4 text-[16px] leading-7 text-muted-foreground">{lede}</p>
        <p className="num mt-3 text-[12px] text-muted-foreground">Updated {updated}</p>
      </header>

      <div className="guide-body mt-10 space-y-8 text-[15px] leading-7">{children}</div>

      {faqs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[20px] font-semibold tracking-tight">Questions</h2>
          <div className="mt-4 divide-y rounded-lg border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-[14.5px] font-medium marker:hidden">
                  <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-45">+</span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-5 text-[14px] leading-6 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 space-y-6">
        <div>
          <p className="eyebrow">Sources</p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-[15px] font-semibold">Run these numbers for your own roof</p>
            <p className="text-[13px] text-muted-foreground">Free account. Uses your bills, your roof and live weather.</p>
          </div>
          <Button asChild>
            <Link href="/signup">
              Create an account <ArrowRight />
            </Link>
          </Button>
        </div>
      </footer>
    </article>
  )
}

/** Server-rendered bar chart for guides (no client JavaScript). */
export function StaticBars({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <figure className="rounded-lg border bg-card p-5">
      <div className="flex h-48 items-end gap-2" role="img" aria-label={`Bar chart in ${unit}`}>
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="num text-[10.5px] text-muted-foreground">{Math.round(d.value)}</span>
            <div
              className="grow-bar w-full rounded-t-[2px] bg-primary/85"
              style={{ height: `${(d.value / max) * 100}%`, animationDelay: `${i * 35}ms` }}
            />
            <span className="text-[11px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-[12px] text-muted-foreground">Values in {unit}.</figcaption>
    </figure>
  )
}
