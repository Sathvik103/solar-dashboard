'use client'

import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Drag-and-drop or click-to-pick upload that sends a document to /api/documents/extract. */
export default function DocumentDrop<T>({
  kind,
  label,
  onExtracted,
}: {
  kind: 'bill' | 'quote'
  label: string
  onExtracted: (fields: T) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (file: File | undefined) => {
    if (!file || busy) return
    setError(null)
    if (file.size > 5 * 1024 * 1024) return setError('File is larger than 5 MB.')
    setBusy(true)
    try {
      const body = new FormData()
      body.set('kind', kind)
      body.set('file', file)
      const res = await fetch('/api/documents/extract', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not read the document.')
      onExtracted(data.fields as T)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the document.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void send(e.dataTransfer.files[0])
        }}
        disabled={busy}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors',
          over ? 'border-primary bg-accent/40' : 'hover:border-primary/50 hover:bg-muted/40',
          busy && 'cursor-wait'
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-primary" /> : <FileUp className="size-5 text-primary" />}
        <span className="text-[13px] font-medium">{busy ? 'Reading the document' : label}</span>
        <span className="text-[12px] text-muted-foreground">PDF, JPG, PNG or WebP up to 5 MB. You review every value before saving.</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void send(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}
    </div>
  )
}
