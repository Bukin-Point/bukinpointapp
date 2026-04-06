'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          The page failed during server rendering. If this keeps happening, use the digest below to
          trace the failure in production.
        </p>
        {error.digest ? (
          <p className="mb-4 rounded-md bg-muted px-3 py-2 font-mono text-sm">{error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex rounded-md border px-4 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
