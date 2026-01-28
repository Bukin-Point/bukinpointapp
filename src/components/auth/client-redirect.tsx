'use client'

import { useEffect, useRef } from 'react'

interface ClientRedirectProps {
  to: string
}

/**
 * Client-side redirect component that ensures the URL bar updates properly
 * Uses window.location.href for a hard navigation to guarantee URL updates
 */
export function ClientRedirect({ to }: ClientRedirectProps) {
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) {
      return
    }
    
    hasRedirected.current = true
    
    // Use window.location.href for a hard navigation that guarantees URL bar update
    // This is more reliable than router.replace() for immediate redirects
    if (typeof window !== 'undefined') {
      window.location.href = to
    }
  }, [to])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
        <p className="text-body-sm text-text-secondary">Redirecting...</p>
      </div>
    </div>
  )
}
