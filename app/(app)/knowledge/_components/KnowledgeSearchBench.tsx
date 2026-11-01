'use client'

import { useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, fmtNum } from '@/components/layout/Page'
import AskButton from '@/components/assistant/AskButton'
import { TELANGANA_EVALUATION_QUERIES } from '@/lib/rag/evaluationQueries'
import type { RetrievalResult } from '@/lib/types/rag'
import { errorMessage } from '@/lib/utils'

type EvalResponse = {
  ragEvaluation?: {
    hitRate?: number
    hitCount?: number
    totalQueries?: number
    top1Accuracy?: number
    top3Accuracy?: number
    mrr?: number
  }
}

const ORGS = ['TGERC', 'TGREDCO', 'TSSPDCL', 'MNRE']

export default function KnowledgeSearchBench() {
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [orgFilter, setOrgFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RetrievalResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [evalData, setEvalData] = useState<EvalResponse | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)

  async function search(q = query) {
    const text = q.trim()
    if (text.length < 3) return
    setQuery(text)
    setLastQuery(text)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, topK, similarityThreshold: 0.25, organization: orgFilter || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.results || [])
    } catch (err) {
      setError(errorMessage(err, 'Search failed'))
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  async function runEvaluation() {
    setEvalLoading(true)
    setEvalError(null)
    try {
      const res = await fetch('/api/eval')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed')
      setEvalData(data)
    } catch (err) {
      setEvalError(errorMessage(err, 'Evaluation failed'))
    } finally {
      setEvalLoading(false)
    }
  }

  const r = evalData?.ragEvaluation

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="min-w-0 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void search()
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. capacity limit for net metering"
              aria-label="Search the regulations"
              className="h-10 pl-9"
            />
          </div>
          <Select aria-label="Organisation" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="h-10 sm:w-40">
            <option value="">All sources</option>
            {ORGS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <Select aria-label="Results" value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="h-10 sm:w-28">
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} results
              </option>
            ))}
          </Select>
          <Button type="submit" size="lg" disabled={loading || query.trim().length < 3}>
            {loading ? 'Searching' : 'Search'}
          </Button>
        </form>

        {error && <p className="text-[13px] text-destructive">{error}</p>}

        {results === null ? (
          <div className="rounded-lg border bg-card">
            <p className="eyebrow border-b px-5 py-2.5">Try a question</p>
            <ul className="divide-y">
              {TELANGANA_EVALUATION_QUERIES.slice(0, 6).map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => void search(q.query)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left text-[13px] hover:bg-muted/50"
                  >
                    {q.query}
                    <Badge variant="outline">{q.expectedOrganization}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : results.length === 0 ? (
          <EmptyState title="No matching passages">
            Try broader wording, or remove the source filter. If nothing ever matches, the knowledge base has not been
            ingested yet (<code className="num">npm run ingest:knowledge</code>).
          </EmptyState>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                {results.length} passage(s) for <span className="text-foreground">{lastQuery}</span>
              </p>
              <AskButton question={lastQuery} size="xs">
                Get an answer
              </AskButton>
            </div>
            {results.map((result, i) => (
              <article key={result.chunkId || i} className="rounded-lg border bg-card">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{result.source.title}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {result.source.organization}
                      {result.sectionTitle && ` · ${result.sectionTitle}`}
                      {result.pageNumber != null && ` · page ${result.pageNumber}`}
                    </p>
                  </div>
                  <span className="num text-[12px] text-muted-foreground">{fmtNum(result.similarity * 100, 1)}% match</span>
                </header>
                <p className="px-5 py-4 text-[13px] leading-6 whitespace-pre-wrap">{result.content}</p>
                <footer className="flex items-center justify-between border-t px-5 py-2.5 text-[12px] text-muted-foreground">
                  <span className="num">
                    {result.source.effectiveDate || result.source.publicationDate || 'Date not stated'}
                    {result.source.version ? ` · ${result.source.version}` : ''}
                  </span>
                  {result.source.sourceUrl && (
                    <a
                      href={result.source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Source <ExternalLink className="size-3" />
                    </a>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Retrieval quality</CardTitle>
              <CardDescription>Runs {TELANGANA_EVALUATION_QUERIES.length} labelled questions against the index.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {r && (
              <dl className="divide-y text-[13px]">
                {[
                  ['Hit rate', `${fmtNum(r.hitRate ?? 0, 1)}%`],
                  ['Top-1 accuracy', `${fmtNum(r.top1Accuracy ?? 0, 1)}%`],
                  ['Top-3 accuracy', `${fmtNum(r.top3Accuracy ?? 0, 1)}%`],
                  ['Mean reciprocal rank', fmtNum(r.mrr ?? 0, 3)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 first:pt-0">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="num">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {evalError && <p className="text-[12px] text-destructive">{evalError}</p>}
            <Button variant="outline" size="sm" className="w-full" onClick={runEvaluation} disabled={evalLoading}>
              {evalLoading ? 'Running' : r ? 'Run again' : 'Run evaluation'}
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-2 px-1 text-[12px] text-muted-foreground">
          <Label className="text-[12px] text-muted-foreground">About these documents</Label>
          <p>
            The bundled documents are unofficial summaries labelled as such. Ingest the official PDFs for verbatim
            citations.
          </p>
        </div>
      </div>
    </div>
  )
}
