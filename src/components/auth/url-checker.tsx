'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Client component to log URL changes and help debug redirect issues
 */
export function UrlChecker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Component exists for potential future debugging, but no logging needed
  }, [pathname, searchParams])

  return null
}
