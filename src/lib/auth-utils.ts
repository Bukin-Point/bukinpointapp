/**
 * Client-safe utility functions for authentication
 * These functions don't use server-only APIs and can be imported in client components
 */

import type { RedirectContext, AuthFlow } from './auth-redirect'

/**
 * Get redirect path based on context (client-safe)
 * This is the single source of truth for all redirects
 */
export function getRedirectPath(context: RedirectContext): string {
  const { userType, flow, needsOnboarding } = context

  // Handle post-signup flows first
  if (flow === 'provider-signup') {
    // Provider signup always goes to onboarding first
    return '/onboarding'
  }

  if (flow === 'staff-signup') {
    // Staff signup goes to dashboard (invitation acceptance handled separately)
    return '/dashboard'
  }

  if (flow === 'customer-signup') {
    // Customer signup goes to customer dashboard
    return '/customer/dashboard'
  }

  // Handle post-signin flows
  if (userType === 'provider') {
    return '/dashboard'
  }

  if (userType === 'staff') {
    return '/dashboard'
  }

  if (userType === 'customer') {
    return '/customer/dashboard'
  }

  // Default: no user type or needs onboarding
  if (needsOnboarding && flow === 'provider-signup') {
    return '/onboarding'
  }

  // Fallback
  return '/signin'
}

/**
 * Get redirect path based on user type (legacy - for backward compatibility)
 * @deprecated Use getRedirectPath with RedirectContext instead
 */
export function getRedirectPathByUserType(
  userType: 'provider' | 'staff' | 'customer' | null
): string {
  switch (userType) {
    case 'provider':
      return '/dashboard'
    case 'staff':
      return '/dashboard' // Staff can access provider dashboard
    case 'customer':
      return '/customer/dashboard'
    default:
      return '/signin'
  }
}

/**
 * Check if current origin is main domain (not subdomain)
 */
export function isMainDomain(): boolean {
  if (typeof window === 'undefined') return false

  const hostname = window.location.hostname

  const isMain =
    hostname === 'bukinpoint.test' ||
    hostname === 'bukinpoint.localhost' ||
    hostname === 'bukinpoint.com' ||
    hostname === 'localhost'

  return isMain
}

/**
 * Validate redirect URL against whitelist (client-side defense in depth)
 * SECURITY: Additional client-side validation
 */
export function validateRedirectUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    // SECURITY: Whitelist validation
    const isProduction = process.env.NODE_ENV === 'production'
    const allowedPatterns = isProduction
      ? [/^[a-z0-9-]+\.bukinpoint\.com$/]
      : [/^[a-z0-9-]+\.bukinpoint\.test$/, /^[a-z0-9-]+\.bukinpoint\.localhost$/]

    const isAllowed = allowedPatterns.some(pattern => pattern.test(hostname))

    if (!isAllowed) {
      console.error('Redirect URL not in whitelist:', url)
      return false
    }

    // SECURITY: Enforce HTTPS in production
    if (isProduction && urlObj.protocol !== 'https:') {
      console.error('Non-HTTPS redirect in production:', url)
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Get redirect URL (root domain only - providers and staff work on root domain)
 * NOTE: Subdomains are only for public booking pages, not authenticated dashboards
 */
export async function getRedirectUrlWithSubdomain(
  context: RedirectContext,
  userId: string
): Promise<string> {
  // Providers and staff always work on root domain - return simple path
  // Customers also work on root domain
  // Subdomains are only used for public booking pages, not dashboard access

  // Determine path based on context
  if (context.flow === 'provider-signup') {
    return '/onboarding?flow=provider-signup'
  } else if (context.userType === 'customer') {
    return getRedirectPath(context) // Customers use customer dashboard
  }

  // For providers and staff, always return root domain dashboard path
  return '/dashboard'
}

