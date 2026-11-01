import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/dal/users'
import { enforce, rateLimitHeaders, tooManyRequests } from '@/lib/rate-limit'
import { getBudget, recordUsage } from '@/lib/agent/budget'
import { extractFromDocument } from '@/lib/ai/llm'
import { ALLOWED_MIME, DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, type DocumentKind } from '@/lib/billing/documents'

/**
 * Reads a bill or quote and returns draft fields for the user to review. Nothing is stored: the file
 * is sent to the model and discarded, and only fields the user confirms are saved later.
 */
export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const limit = await enforce('documentExtract', user.id)
  if (!limit.allowed) return tooManyRequests(limit, 'Too many documents in a short time. Try again later.')
  const headers = rateLimitHeaders(limit)

  if (Number(request.headers.get('content-length') ?? 0) > MAX_DOCUMENT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'File is larger than 5 MB' }, { status: 413, headers })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected a file upload' }, { status: 400, headers })
  }
  const kind = z.enum(['bill', 'quote']).safeParse(form.get('kind'))
  const file = form.get('file')
  if (!kind.success) return NextResponse.json({ error: 'Unknown document type' }, { status: 400, headers })
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Choose a file' }, { status: 400, headers })
  if (file.size > MAX_DOCUMENT_BYTES) return NextResponse.json({ error: 'File is larger than 5 MB' }, { status: 413, headers })
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: 'Upload a PDF, JPG, PNG or WebP' }, { status: 415, headers })
  }

  const budget = await getBudget(user.id)
  if (budget.remaining <= 0) {
    return NextResponse.json({ error: `Daily limit of ${budget.limit} AI requests reached. Enter the values manually.` }, { status: 429, headers })
  }

  const spec = DOCUMENT_KINDS[kind.data as DocumentKind]
  const t0 = Date.now()
  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const result = await extractFromDocument({
      prompt: spec.prompt,
      mimeType: file.type,
      base64,
      jsonSchema: z.toJSONSchema(spec.schema),
    })
    void recordUsage({
      userId: user.id,
      model: result.model,
      purpose: `extract_${kind.data}`,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
      outcome: 'ok',
    })

    const parsed = spec.schema.safeParse(JSON.parse(result.text))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Could not read the document reliably. Enter the values manually.' }, { status: 422, headers })
    }
    if (!parsed.data.readable) {
      return NextResponse.json({ error: `That does not look like ${kind.data === 'bill' ? 'an electricity bill' : 'a solar quote'}.` }, { status: 422, headers })
    }
    return NextResponse.json({ kind: kind.data, fields: parsed.data }, { headers })
  } catch (error) {
    void recordUsage({ userId: user.id, model: 'chain', purpose: `extract_${kind.data}`, latencyMs: Date.now() - t0, outcome: 'error' })
    console.error('[api/documents/extract] failed', error)
    return NextResponse.json({ error: 'Reading the document failed. Enter the values manually.' }, { status: 502, headers })
  }
}
