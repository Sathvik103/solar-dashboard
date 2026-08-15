'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div className="p-8 max-w-xl mx-auto flex items-center justify-center min-h-[60vh]">
      <Card className="w-full border-destructive/20">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center gap-2">
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred while loading this page. Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-32 text-destructive">
              {error.message}
            </div>
          )}

          <Button
            onClick={() => unstable_retry()}
            variant="default"
            className="self-start"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
