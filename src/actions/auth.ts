'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getRedirectContext } from '@/lib/auth-redirect'
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
      return null
    }

    const userId = session.user.id

    // IMPORTANT: Check for pending invitations FIRST (before checking onboarding status)
    // This ensures new staff members have their invitations accepted and onboardingCompleted set to true
    // before we check if they need onboarding
    let invitationCheckResult: any = null
    let hasPendingInvitations = false
    try {
      // Quick check if there are any pending invitations
      const pendingInvitation = await prisma.staffInvitation.findFirst({
        where: {
          email: session.user.email,
          expiresAt: { gt: new Date() },
          acceptedAt: null,
        },
        select: { id: true },
      })
      hasPendingInvitations = !!pendingInvitation

      if (hasPendingInvitations) {
        // Accept all pending invitations (this will create staff members and set onboardingCompleted = true)
        const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
        invitationCheckResult = await Promise.race([
          checkAndAcceptPendingInvitations(userId, session.user.email || ''),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])

        // Wait a bit for staff member to be created and onboardingCompleted to be set
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (err) {
      console.warn('Invitation check timed out or failed, continuing with redirect:', err)
    }

    // NOW check onboarding status (after invitations have been processed)
    let onboardingCompleted = false
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, onboardingCompleted: true },
      })
      onboardingCompleted = user?.onboardingCompleted ?? false
    } catch (error) {
      // Fallback: If onboardingCompleted field doesn't exist yet (during migration), continue with legacy checks
      console.warn('onboardingCompleted field not available, using legacy checks:', error)
    }

    // If user has completed onboarding, skip onboarding check entirely
    if (onboardingCompleted) {
      // User has completed onboarding (staff or provider) - continue with normal redirect
    } else {
      // User hasn't completed onboarding - check if they need it
      // Check if user has provider record
      const hasProviderRecord = await prisma.provider.findUnique({
        where: { userId },
        select: { id: true },
      })

      // If user doesn't have provider record, they need onboarding
      if (!hasProviderRecord) {
        // Check if they're staff (staff don't need onboarding)
        const isStaff = await prisma.staffMember.findFirst({
          where: { userId },
          select: { id: true, providerId: true },
        })
        
        if (!isStaff) {
          // New user without provider or staff - needs onboarding
          return '/onboarding?flow=provider-signup'
        }
      }
    }

    // Get redirect context
    let context
    try {
      context = await Promise.race([
        getRedirectContext(userId, 'signin'),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
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
      return '/onboarding?flow=provider-signup'
    } else if (context.userType === 'customer') {
      // Customers don't have subdomains
      return getRedirectPath(context)
    }

    // Providers and staff work on root domain - simple redirect to dashboard
    return path
  } catch (error) {
    console.error('Error in getPostSigninRedirectUrl:', error)
    // Fallback to main domain dashboard
    return '/dashboard'
  }
}
