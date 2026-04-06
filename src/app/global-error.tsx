'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-lg border bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-semibold">Application Error</h1>
            <p className="mb-4 text-sm text-slate-600">
              The app failed before the route error boundary could render.
            </p>
            {error.digest ? (
              <p className="mb-4 rounded-md bg-slate-100 px-3 py-2 font-mono text-sm">
                {error.digest}
              </p>
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
      </body>
    </html>
  )
}
