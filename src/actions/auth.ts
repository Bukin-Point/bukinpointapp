'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import {
  getRedirectContext,
  getSecureSubdomainRedirect,
  getProviderSubdomain,
  getStaffProviderSubdomain,
} from '@/lib/auth-redirect'
// getRedirectPath is client-side only, so we'll duplicate the logic here
function getRedirectPath(context: {
  userType?: string | null
  flow?: string | null
  needsOnboarding?: boolean
}): string {
  // Handle post-signup flows first
  if (context.flow === 'provider-signup') {
    return '/onboarding'
  }
  if (context.flow === 'staff-signup') {
    return '/dashboard'
  }
  if (context.flow === 'customer-signup') {
    return '/customer/dashboard'
  }
  // Handle post-signin flows
  if (context.userType === 'provider') {
    return '/dashboard'
  }
  if (context.userType === 'staff') {
    return '/dashboard'
  }
  if (context.userType === 'customer') {
    return '/customer/dashboard'
  }
  // Fallback
  return '/dashboard'
}

/**
 * Get user type (server action for client components)
 */
export async function getUserTypeAction(
  userId: string
): Promise<'provider' | 'staff' | 'customer' | null> {
  try {
    // Check if user is a provider
    const provider = await prisma.provider.findUnique({
      where: { userId },
    })

    if (provider) {
      return 'provider'
    }

    // Check if user is staff
    const staffMember = await prisma.staffMember.findFirst({
      where: { userId },
      select: { id: true },
    })

    if (staffMember) {
      return 'staff'
    }

    // Otherwise, they're a customer
    return 'customer'
  } catch (error) {
    console.error('Error in getUserTypeAction:', error)
    // On error, default to customer to avoid blocking access
    return 'customer'
  }
}

/**
 * Get post-signin redirect URL (server action)
 * Called directly from onSuccess callback - no polling, no useEffect needed
 */
export async function getPostSigninRedirectUrl(): Promise<string | null> {
  try {
    // Get session from cookies/headers (server-side)
    const session = await getSession()
    
    if (!session?.user?.id) {
      // #region agent log
      // Server action - write to log file directly
      const fs = await import('fs/promises')
      const logEntry = JSON.stringify({
        location: 'actions/auth.ts:58',
        message: 'No session in getPostSigninRedirectUrl',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }) + '\n'
      fs.appendFile('/Users/apple/Documents/apps/web/bukinpoint/.cursor/debug.log', logEntry).catch(() => {})
      // #endregion
      return null
    }

    const userId = session.user.id

    // Check for pending invitations (with timeout)
    try {
      const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
      await Promise.race([
        checkAndAcceptPendingInvitations(userId, session.user.email || ''),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ])
    } catch (err) {
      console.warn('Invitation check timed out or failed, continuing with redirect:', err)
    }

    // Wait a bit for staff member to be created if needed
    await new Promise(resolve => setTimeout(resolve, 500))

    // Get redirect context
    let context
    try {
      context = await Promise.race([
        getRedirectContext(userId, 'signin'),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ])
    } catch (err) {
      console.error('Error getting redirect context, using fallback:', err)
      const userType = await getUserTypeAction(userId).catch(() => null)
      context = { userType: userType || 'customer' }
    }

    // Determine path based on context
    let path = '/dashboard'
    if (context.flow === 'provider-signup') {
      path = '/onboarding'
    } else if (context.userType === 'customer') {
      // Customers don't have subdomains
      return getRedirectPath(context)
    }

    // Get subdomain based on user type
    let subdomain: string | null = null
    if (context.userType === 'provider') {
      subdomain = await getProviderSubdomain(userId)
    } else if (context.userType === 'staff') {
      subdomain = await getStaffProviderSubdomain(userId)
    }

    // Get secure redirect URL (server-side validated)
    const redirectUrl = await getSecureSubdomainRedirect(userId, subdomain, path)

    // #region agent log
    // Server action - write to log file directly
    const fs = await import('fs/promises')
    const logEntry = JSON.stringify({
      location: 'actions/auth.ts:115',
      message: 'Post-signin redirect URL obtained',
      data: {
        userId,
        userType: context.userType,
        subdomain,
        redirectUrl,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'C',
    }) + '\n'
    fs.appendFile('/Users/apple/Documents/apps/web/bukinpoint/.cursor/debug.log', logEntry).catch(() => {})
    // #endregion

    return redirectUrl
  } catch (error) {
    console.error('Error in getPostSigninRedirectUrl:', error)
    // Fallback to main domain dashboard
    return '/dashboard'
  }
}
