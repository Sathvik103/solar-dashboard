'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TokenReveal({ token, title }: { token: string; title: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div role="status" className="space-y-2 rounded-md border border-warning/30 bg-warning/8 p-4">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="text-[12px] text-muted-foreground">
        Copy this device token now. Only a hash is stored, so it cannot be shown again; rotate it if it is lost.
      </p>
      <div className="flex items-center gap-2">
        <code className="num min-w-0 flex-1 truncate rounded-sm border bg-card px-2 py-1.5 text-[12px] select-all">{token}</code>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Copy token"
          onClick={async () => {
            await navigator.clipboard.writeText(token)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="text-positive" /> : <Copy />}
        </Button>
      </div>
    </div>
  )
}
