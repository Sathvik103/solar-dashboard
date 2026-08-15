'use client'

import { useState } from 'react'
import { Search, ExternalLink, BookOpen, Filter, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TELANGANA_EVALUATION_QUERIES } from '@/lib/rag/evaluation'
import type { RetrievalResult } from '@/lib/types/rag'

export default function KnowledgeSearchBench() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)
  const [threshold, setThreshold] = useState(0.3)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RetrievalResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query
    if (!q || q.trim().length < 3) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          topK,
          similarityThreshold: threshold,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute knowledge search')
      }
      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search Configuration & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" /> Knowledge Base Search & Retrieval
          </CardTitle>
          <CardDescription>
            Search Telangana rooftop solar regulations, TGREDCO guidelines, TSSPDCL procedures, and PM Surya Ghar scheme rules.
            <span className="block mt-1 font-semibold text-foreground">
              Pure RAG Retrieval — No LLM generation or chatbot involved.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ask a question (e.g. What are the rooftop solar net-metering rules in Telangana?)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={loading || query.trim().length < 3}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Quick Evaluation Query Bench */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Label className="text-xs font-semibold text-muted-foreground">
              Sample Evaluation Queries (Click to test):
            </Label>
            <div className="flex flex-wrap gap-2">
              {TELANGANA_EVALUATION_QUERIES.slice(0, 5).map((q) => (
                <Button
                  key={q.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setQuery(q.query)
                    handleSearch(q.query)
                  }}
                >
                  {q.query}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Hyperparameters */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
            <div className="flex items-center gap-3">
              <Label htmlFor="topK" className="whitespace-nowrap">
                Top-K Results: <span className="font-bold">{topK}</span>
              </Label>
              <input
                id="topK"
                type="range"
                min="1"
                max="15"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="threshold" className="whitespace-nowrap">
                Similarity Threshold: <span className="font-bold">{threshold}</span>
              </Label>
              <input
                id="threshold"
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Output */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {results && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Retrieved Passages ({results.length})
            </h2>
            <Badge variant="outline">{results.length > 0 ? 'Matches Found' : 'No Matches Above Threshold'}</Badge>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No published knowledge passages met the similarity threshold ({threshold}). Try lowering the threshold or refining your search term.
              </CardContent>
            </Card>
          ) : (
            results.map((result, idx) => (
              <Card key={result.chunkId || idx} className="hover:border-amber-500/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-amber-600 font-mono text-xs">
                          # {idx + 1}
                        </Badge>
                        <Badge variant="secondary" className="font-medium">
                          {result.source.organization}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.source.documentType}
                        </Badge>
                        {result.source.locationScope && (
                          <Badge variant="outline" className="text-xs bg-slate-50">
                            📍 {result.source.locationScope}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold mt-1">
                        {result.source.title}
                      </CardTitle>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">Cosine Similarity</span>
                      <span className="text-sm font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {(result.similarity * 100).toFixed(1)}% ({result.similarity})
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3 text-sm">
                  {/* Section / Page metadata */}
                  {(result.sectionTitle || result.pageNumber != null) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded">
                      {result.sectionTitle && (
                        <span>
                          <strong>Section:</strong> {result.sectionTitle}
                        </span>
                      )}
                      {result.pageNumber != null && (
                        <span>
                          <strong>Page:</strong> {result.pageNumber}
                        </span>
                      )}
                      <span>
                        <strong>Chunk #:</strong> {result.chunkIndex}
                      </span>
                    </div>
                  )}

                  {/* Chunk content */}
                  <div className="p-3 bg-card border rounded-md font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {result.content}
                  </div>

                  {/* Provenance Footer with Source Link */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-1">
                    <span>
                      Effective: {result.source.effectiveDate || result.source.publicationDate || 'N/A'}
                      {result.source.version ? ` | Version: ${result.source.version}` : ''}
                    </span>
                    <a
                      href={result.source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      Official Source Document <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
