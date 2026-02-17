import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import {
  getRedirectContext,
  getSecureSubdomainRedirect,
  getProviderSubdomain,
  getStaffProviderSubdomain,
} from '@/lib/auth-redirect'
import { AuthRedirectClient } from '@/components/auth/auth-redirect-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProviderRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; type?: string; token?: string }>
}) {
  const params = await searchParams
  const flow = params?.flow
  const requestedType = params?.type
  const token = params?.token

  const session = await getSession()

  if (!session) {
    console.log('[Redirect] No session on server, delegating to client-side AuthRedirectClient')
    return <AuthRedirectClient />
  }

  console.log(`[Redirect] Processing flow: ${flow || 'default'}, user: ${session.user.id}`)

  // Check Clerk metadata first for account type
  let accountTypeFromMetadata: 'provider' | 'staff' | 'customer' | null = null
  try {
    const clerkUser = await currentUser()
    if (clerkUser?.publicMetadata?.accountType) {
      accountTypeFromMetadata = clerkUser.publicMetadata.accountType as 'provider' | 'staff' | 'customer'
      console.log(`[Redirect] Account type from metadata: ${accountTypeFromMetadata}`)
    }
  } catch (error) {
    console.warn('[Redirect] Error reading Clerk metadata:', error)
  }

  // Handle different signup flows - CHECK FLOW FIRST before other logic
  if (flow === 'provider-signup') {
    console.log('[Redirect] Handling provider-signup flow')
    // IMPORTANT: Before redirecting to onboarding, check if user has pending staff invitations
    // If they do, accept them and redirect to dashboard instead
    try {
      const { prisma } = await import('@/lib/db')
      const pendingInvitation = await prisma.staffInvitation.findFirst({
        where: {
          email: session.user.email,
          expiresAt: { gt: new Date() },
          acceptedAt: null,
        },
        select: { id: true, token: true, providerId: true },
      })

      if (pendingInvitation) {
        console.log(`[Redirect] Found pending invitation for new provider: ${pendingInvitation.id}`)
        // User has pending invitation - accept it and redirect to dashboard
        const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
        await Promise.race([
          checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])

        // Wait for staff member creation to complete
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log('[Redirect] Invitation accepted, redirecting to dashboard')
        redirect('/dashboard')
      }
    } catch (error) {
      console.warn('[Redirect] Error checking invitations, continuing with onboarding redirect:', error)
    }

    // No pending invitation - proceed with provider onboarding
    console.log('[Redirect] No invitations, redirecting to onboarding')
    redirect('/onboarding?flow=provider-signup')
  } else if (flow === 'staff-signup') {
    console.log('[Redirect] Handling staff-signup flow')
    // Staff signup - accept invitation and redirect to dashboard
    try {
      const { prisma } = await import('@/lib/db')

      // If token is provided, use it for more precise matching
      if (token) {
        console.log(`[Redirect] Accepting invitation with token: ${token.substring(0, 8)}...`)
        const { acceptInvitationAfterSignup } = await import('@/actions/staff-invitations')
        const result = await Promise.race([
          acceptInvitationAfterSignup(token, session.user.id),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])

        if (result?.error) {
          console.warn('[Redirect] Error accepting invitation with token:', result.error)
          // Fall back to email-based check
        }
      } else {
        // Fall back to email-based check
        console.log('[Redirect] No token, falling back to email-based invitation check')
        const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
        await Promise.race([
          checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.warn('[Redirect] Error accepting staff invitation:', error)
    }

    redirect('/dashboard')
  }

  // For signin, check for pending invitations first
  try {
    const { prisma } = await import('@/lib/db')
    const pendingInvitation = await prisma.staffInvitation.findFirst({
      where: {
        email: session.user.email,
        expiresAt: { gt: new Date() },
        acceptedAt: null,
      },
      select: { id: true, token: true, providerId: true },
    })

    if (pendingInvitation) {
      console.log(`[Redirect] Found pending invitation during signin: ${pendingInvitation.id}`)
      // User has pending invitation - accept it
      const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
      await Promise.race([
        checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ])

      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } catch (error) {
    console.warn('[Redirect] Error checking invitations:', error)
  }

  // Get redirect context (checks database)
  const userId = session.user.id
  let context
  try {
    console.log(`[Redirect] Fetching redirect context for user: ${userId}`)
    context = await Promise.race([
      getRedirectContext(userId, 'signin'),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ])
  } catch (err) {
    console.error('[Redirect] Error getting redirect context, using fallback:', err)
    // Use metadata if available, otherwise default to customer
    context = {
      userType: accountTypeFromMetadata || 'customer',
    }
  }

  console.log(`[Redirect] Context determined: type=${context.userType}, flow=${context.flow || 'none'}`)

  // Update Clerk metadata if it's different from what we determined
  if (context.userType && context.userType !== accountTypeFromMetadata) {
    try {
      const clerkUser = await currentUser()
      if (clerkUser?.id) {
        console.log(`[Redirect] Updating Clerk metadata for ${clerkUser.id} to type: ${context.userType}`)
        const client = await clerkClient()
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            accountType: context.userType,
            ...(flow && { signupFlow: flow }),
          },
        })
      }
    } catch (error) {
      console.warn('[Redirect] Error updating Clerk metadata:', error)
      // Don't fail redirect if metadata update fails
    }
  }

  // If metadata says customer but we're in provider redirect, redirect to customer dashboard
  if (accountTypeFromMetadata === 'customer') {
    console.log('[Redirect] Overriding to customer dashboard based on metadata')
    redirect('/customer/dashboard')
  }

  // Determine path based on context
  let path = '/dashboard'
  if (context.flow === 'provider-signup') {
    path = '/onboarding'
  } else if (context.userType === 'customer') {
    // Customer in provider redirect handler - redirect to customer dashboard
    console.log('[Redirect] Redirecting to customer dashboard')
    redirect('/customer/dashboard')
  }

  // Get subdomain based on user type
  let subdomain: string | null = null
  try {
    if (context.userType === 'provider') {
      subdomain = await getProviderSubdomain(userId)
    } else if (context.userType === 'staff') {
      subdomain = await getStaffProviderSubdomain(userId)
    }
    console.log(`[Redirect] Subdomain for ${context.userType}: ${subdomain || 'none'}`)
  } catch (error) {
    console.error('[Redirect] Error fetching subdomain:', error)
  }

  // Get secure redirect URL (server-side validated)
  const redirectUrl = await getSecureSubdomainRedirect(userId, subdomain, path)

  if (redirectUrl) {
    console.log(`[Redirect] Executing secure redirect to: ${redirectUrl}`)
    redirect(redirectUrl)
  }

  // Fallback to main domain dashboard
  console.log(`[Redirect] Falling back to main domain path: ${path}`)
  redirect(path)
}
