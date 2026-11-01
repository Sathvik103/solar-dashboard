import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Reads and validates a JSON body with a hard size cap, returning a ready-made error response on failure. */
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes: number,
  headers?: Record<string, string>
): Promise<BodyResult<T>> {
  const fail = (status: number, body: Record<string, unknown>) => ({
    ok: false as const,
    response: NextResponse.json(body, { status, headers }),
  })
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return fail(413, { error: 'Payload too large' })

  let raw: unknown
  try {
    const text = await request.text()
    if (text.length > maxBytes) return fail(413, { error: 'Payload too large' })
    raw = JSON.parse(text)
  } catch {
    return fail(400, { error: 'Invalid JSON payload' })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return fail(422, {
      error: 'Validation failed',
      issues: parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }
  return { ok: true, data: parsed.data }
}
