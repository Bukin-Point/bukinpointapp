'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export function AuthRedirectClient() {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasRedirected, setHasRedirected] = useState(false)
  const flow = searchParams.get('flow')

  useEffect(() => {
    if (!isLoaded || hasRedirected) return

    if (!userId) {
      // Wait a bit more in case session is still loading
      const timer = setTimeout(() => {
        if (!userId) {
          router.push('/signin')
          setHasRedirected(true)
        }
      }, 500)
      return () => clearTimeout(timer)
    }

    // Session is loaded and user is authenticated, refresh to trigger server-side redirect
    setHasRedirected(true)
    router.refresh()
  }, [isLoaded, userId, router, hasRedirected, flow])

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
