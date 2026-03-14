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
  if (needsOnboarding) {
    return '/onboarding'
  }

  // Fallback
  return '/signin'
}

/**
 * Get redirect path based on user type (legacy - for backward compatibility)
 * @deprecated Use getRedirectPath with RedirectContext instead
 */
export function getRedirectPathByUserType(userType: 'provider' | 'staff' | 'customer' | null): string {
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
  
  
  const isMain = (
    hostname === 'bukinpoint.test' ||
    hostname === 'bukinpoint.localhost' ||
    hostname === 'bukinpoint.com' ||
    hostname === 'localhost'
  )
  
  
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

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(hostname))

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
 * Get redirect URL with subdomain support (client-safe wrapper)
 */
export async function getRedirectUrlWithSubdomain(
  context: RedirectContext,
  userId: string
): Promise<string> {
  // Import server actions
  const {
    getProviderSubdomain,
    getStaffProviderSubdomain,
    getSecureSubdomainRedirect,
  } = await import('@/lib/auth-redirect')

  // SECURITY: Always redirect to user's OWN subdomain, regardless of current domain
  // This prevents users from staying on subdomains they don't own after signin
  const isOnMainDomain = isMainDomain()
  

  // Determine path based on context
  // IMPORTANT: Always use /dashboard for signin, never /signin
  let path = '/dashboard'
  if (context.flow === 'provider-signup') {
    path = '/onboarding'
  } else if (context.userType === 'customer') {
    return getRedirectPath(context) // Customers don't have subdomains
  }

  // Get subdomain based on user type (always get user's own subdomain)
  let subdomain: string | null = null
  if (context.userType === 'provider') {
    subdomain = await getProviderSubdomain(userId)
  } else if (context.userType === 'staff') {
    subdomain = await getStaffProviderSubdomain(userId)
  }

  // SECURITY: Always redirect to user's OWN subdomain, even if currently on different subdomain
  // Get secure redirect URL (server-side validated)
  // Ensure path is always /dashboard for signin flow, never /signin
  const redirectUrl = await getSecureSubdomainRedirect(userId, subdomain, path)


  // If we got a full URL (user's subdomain), use it regardless of current domain
  // This ensures users always go to their own subdomain after signin
  if (redirectUrl && validateRedirectUrl(redirectUrl)) {
    // Final safety check: ensure redirect URL doesn't contain /signin
    const urlObj = new URL(redirectUrl)
    if (urlObj.pathname === '/signin') {
      console.warn('[getRedirectUrlWithSubdomain] Redirect URL contains /signin, fixing to /dashboard')
      urlObj.pathname = '/dashboard'
      return urlObj.toString()
    }
    return redirectUrl
  }

  // If no subdomain redirect available, fall back to path
  // But if on a subdomain, redirect to main domain first to trigger security check
  if (!isOnMainDomain) {
    // On wrong subdomain - redirect to main domain, which will then redirect to user's subdomain
    const isLocal = process.env.NODE_ENV === 'development'
    const baseDomain = isLocal ? 'bukinpoint.test' : 'bukinpoint.com'
    const protocol = isLocal ? 'http' : 'https'
    const port = isLocal ? ':3000' : ''
    const mainDomainUrl = `${protocol}://${baseDomain}${port}${path}`
    return mainDomainUrl
  }

  // Fallback to normal path redirect
  return getRedirectPath(context)
}

/**
 * Client-side sanitization of providerId
 * SECURITY: This is a defense-in-depth measure, server-side validation is still required
 */
export function sanitizeProviderId(providerId: string | null | undefined): string | null {
  if (!providerId || typeof providerId !== 'string') {
    return null
  }

  // Remove any non-alphanumeric characters except hyphens and underscores
  const sanitized = providerId.replace(/[^a-zA-Z0-9_-]/g, '')
  
  // Check length (CUIDs are typically 25 characters)
  if (sanitized.length < 1 || sanitized.length > 50) {
    return null
  }

  return sanitized
}
