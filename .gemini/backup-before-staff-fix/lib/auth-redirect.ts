/**
 * Centralized authentication redirect logic (Server Actions)
 * Handles post-signup and post-signin redirects based on user type and flow context
 */

'use server'

import { prisma } from './db'

export type UserType = 'provider' | 'staff' | 'customer' | null
export type AuthFlow = 'provider-signup' | 'staff-signup' | 'customer-signup' | 'signin' | null

export interface RedirectContext {
  userType: UserType
  flow?: AuthFlow
  hasProvider?: boolean
  hasStaffMember?: boolean
  needsOnboarding?: boolean
}

/**
 * Determine user type from database
 */
export async function getUserType(userId: string): Promise<UserType> {
  try {
    // Check if user is a provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
    })

    if (provider) {
      return 'provider'
    }

    // Check if user has UserProvider relationship (staff)
    const userProvider = await prisma.userProvider.findFirst({
      where: { userId },
      select: { id: true },
    })

    if (userProvider) {
      return 'staff'
    }

    // Otherwise, they're a customer
    return 'customer'
  } catch (error) {
    console.error('Error in getUserType:', error)
    return null
  }
}

/**
 * Get redirect context for a user
 */
export async function getRedirectContext(
  userId: string,
  flow?: AuthFlow
): Promise<RedirectContext> {
  const userType = await getUserType(userId)

  // Check if user needs onboarding (provider signup but no provider record)
  const needsOnboarding =
    flow === 'provider-signup' && userType === 'customer' && !(await hasProvider(userId))

  return {
    userType,
    flow,
    hasProvider: userType === 'provider',
    hasStaffMember: userType === 'staff',
    needsOnboarding,
  }
}

/**
 * Check if user has provider record
 */
async function hasProvider(userId: string): Promise<boolean> {
  const provider = await prisma.provider.findUnique({
    where: { userId },
  })
  return !!provider
}

/**
 * Get provider subdomain with ownership verification
 * SECURITY: Verifies subdomain belongs to authenticated user
 */
export async function getProviderSubdomain(userId: string): Promise<string | null> {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth-redirect.ts:89', message: 'Getting provider subdomain', data: { userId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
  // #endregion
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: { subdomain: true, status: true, id: true, businessName: true },
    })

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'auth-redirect.ts:95', message: 'Provider subdomain query result', data: { userId, found: !!provider, providerId: provider?.id, businessName: provider?.businessName, subdomain: provider?.subdomain, status: provider?.status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion

    // Only return if provider exists and is active
    if (!provider || provider.status !== 'ACTIVE' || !provider.subdomain) {
      return null
    }

    return provider.subdomain
  } catch (error) {
    console.error('Error getting provider subdomain:', error)
    return null
  }
}

/**
 * Get staff member's provider subdomain with ownership verification
 * SECURITY: Verifies staff member belongs to provider
 */
export async function getStaffProviderSubdomain(userId: string): Promise<string | null> {
  try {
    const userProvider = await prisma.userProvider.findFirst({
      where: { userId },
      include: {
        provider: {
          select: { subdomain: true, status: true },
        },
      },
    })

    if (
      !userProvider?.provider ||
      userProvider.provider.status !== 'ACTIVE' ||
      !userProvider.provider.subdomain
    ) {
      return null
    }

    return userProvider.provider.subdomain
  } catch (error) {
    console.error('Error getting staff provider subdomain:', error)
    return null
  }
}

/**
 * Validate and build secure subdomain redirect URL
 * SECURITY: Whitelist validation - only allows trusted domains
 */
export async function getSecureSubdomainRedirect(
  userId: string,
  subdomain: string | null,
  path: string
): Promise<string | null> {
  // Must have subdomain
  if (!subdomain) {
    return null
  }

  // SECURITY: Validate subdomain format (prevent injection)
  if (!/^[a-z0-9-]{1,63}$/.test(subdomain)) {
    console.error('Invalid subdomain format:', subdomain)
    return null
  }

  // SECURITY: Check reserved subdomains
  const { isReservedSubdomain } = await import('@/lib/subdomain-utils')
  if (isReservedSubdomain(subdomain)) {
    console.error('Reserved subdomain:', subdomain)
    return null
  }

  // SECURITY: Verify subdomain exists in database and belongs to user
  // Optimize query by checking provider ownership first (most common case)
  let provider: { status: string } | null = null
  try {
    // First, try to find provider by subdomain and userId (most common case - provider owns it)
    provider = await prisma.provider.findFirst({
      where: {
        subdomain,
        userId, // Provider owns it
      },
      select: { status: true },
    })

    // If not found and user might be staff, check UserProvider relationship
    if (!provider) {
      // Check if user has UserProvider for this provider
      const userProvider = await prisma.userProvider.findFirst({
        where: {
          userId,
          provider: {
            subdomain,
          },
        },
        select: {
          provider: {
            select: { status: true },
          },
        },
      })

      if (userProvider?.provider) {
        provider = { status: userProvider.provider.status }
      }
    }
  } catch (error: any) {
    // Handle database errors gracefully
    if (error?.code === 'ETIMEDOUT' || error?.code === 'P1008') {
      console.error('Database connection timeout in getSecureSubdomainRedirect:', error)
      // On timeout, fail securely - don't redirect to subdomain
      // Return null to fallback to main domain
      return null
    } else {
      console.error('Database error in getSecureSubdomainRedirect:', error)
      // On database error, fail securely - don't redirect
      return null
    }
  }

  if (!provider || provider.status !== 'ACTIVE') {
    console.error('Subdomain not found or inactive for user:', subdomain, userId)
    return null
  }

  // SECURITY: Whitelist validation - only allow trusted base domains
  const allowedDomains =
    process.env.NODE_ENV === 'production'
      ? ['bukinpoint.com']
      : ['bukinpoint.test', 'bukinpoint.localhost']

  // Build URL (will be validated client-side too)
  const baseDomain = allowedDomains[0] // Use first allowed domain
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const port = process.env.NODE_ENV === 'development' ? ':3000' : ''

  // SECURITY: Ensure path is never /signin (should always be /dashboard or /onboarding)
  // Also ensure path is never empty or just a slash
  let safePath = path === '/signin' || path === '/signin/' ? '/dashboard' : path
  if (!safePath || safePath === '/' || safePath === '') {
    safePath = '/dashboard'
  }

  // Double-check: if path somehow still contains 'signin', force it to /dashboard
  if (safePath.toLowerCase().includes('signin')) {
    console.warn('[getSecureSubdomainRedirect] Path contains signin, forcing to /dashboard:', safePath)
    safePath = '/dashboard'
  }

  const redirectUrl = `${protocol}://${subdomain}.${baseDomain}${port}${safePath}`

  // #region agent log
  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[getSecureSubdomainRedirect] Built redirect URL:', {
      subdomain,
      path,
      safePath,
      redirectUrl,
    })
  }
  // #endregion

  // Final validation: ensure redirect URL doesn't contain /signin
  if (redirectUrl.includes('/signin')) {
    console.error('[getSecureSubdomainRedirect] CRITICAL: Redirect URL contains /signin!', redirectUrl)
    // Fix it
    const fixedUrl = redirectUrl.replace('/signin', '/dashboard')
    console.warn('[getSecureSubdomainRedirect] Fixed redirect URL:', fixedUrl)
    return fixedUrl
  }

  return redirectUrl
}
